import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import archiver from "archiver";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.cwd() + "/uploads";

function sanitize(name: string): string {
  return name.replace(/[\/\\]/g, "_").replace(/\.\./g, "_").trim() || "file";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

  // Resolve which files the requester may download.
  let where: Record<string, any>;
  let zipBaseName = "files";
  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    if (targetUserId) {
      const owner = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, companyName: true },
      });
      where = { userId: targetUserId };
      zipBaseName = sanitize(owner?.companyName || owner?.name || "client");
    } else {
      where = {}; // all files across all clients
      zipBaseName = "all-files";
    }
  } else {
    const userIds = await getCompanyUserIds(user.id);
    where = { userId: { in: userIds } };
    zipBaseName = "my-files";
  }

  const files = await prisma.clientFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (files.length === 0) {
    return NextResponse.json({ error: "No files to download" }, { status: 404 });
  }

  const isAdminAll = (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && !targetUserId;

  // ClientFile has no `user` relation, so map userId -> display name when
  // we need per-client top-level folders (admin downloading everything).
  const nameById = new Map<string, string>();
  if (isAdminAll) {
    const owners = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set(files.map((f) => f.userId))) } },
      select: { id: true, name: true, companyName: true },
    });
    for (const o of owners) nameById.set(o.id, o.companyName || o.name || "Unknown client");
  }

  const archive = archiver("zip", { zlib: { level: 9 } });

  // Track used paths to disambiguate duplicate names within the same folder.
  const usedPaths = new Set<string>();

  for (const file of files) {
    const diskPath = path.join(UPLOADS_DIR, file.filename);
    if (!existsSync(diskPath)) continue;

    const segments: string[] = [];
    if (isAdminAll) {
      segments.push(sanitize(nameById.get(file.userId) || "Unknown client"));
    }
    if (file.folder) segments.push(sanitize(file.folder));
    segments.push(sanitize(file.originalName));

    let entryPath = segments.join("/");
    // Disambiguate collisions: "name.pdf" -> "name (2).pdf"
    if (usedPaths.has(entryPath)) {
      const dir = segments.slice(0, -1).join("/");
      const base = segments[segments.length - 1];
      const ext = path.extname(base);
      const stem = base.slice(0, base.length - ext.length);
      let n = 2;
      do {
        const candidate = `${stem} (${n})${ext}`;
        entryPath = dir ? `${dir}/${candidate}` : candidate;
        n++;
      } while (usedPaths.has(entryPath));
    }
    usedPaths.add(entryPath);

    archive.append(createReadStream(diskPath), { name: entryPath });
  }

  archive.finalize();

  // Convert the Node archiver stream to a web ReadableStream for the Response.
  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipBaseName}-${date}.zip"`,
    },
  });
}
