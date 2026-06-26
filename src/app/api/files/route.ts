import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { createNotification } from "@/lib/notifications";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = process.cwd() + "/uploads";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;

  if (user.role === "CLIENT") {
    const userIds = await getCompanyUserIds(user.id);
    const files = await prisma.clientFile.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(files);
  }

  const files = await prisma.clientFile.findMany({
    orderBy: { createdAt: "desc" },
  });
  const userIds = Array.from(new Set(files.map((f) => f.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, companyName: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const result = files.map((f) => ({ ...f, user: userMap[f.userId] ?? null }));
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const replaceFileId = url.searchParams.get("replaceFileId");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;
  const label = (formData.get("label") as string | null) || undefined;
  const folder = ((formData.get("folder") as string | null) || "").trim() || undefined;

  if (!file || !userId) {
    return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const filename = randomUUID() + ext;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(bytes));

  // Determine if this is a replacement (new version)
  let existingFile = null;
  if (replaceFileId) {
    existingFile = await prisma.clientFile.findUnique({ where: { id: replaceFileId } });
  } else if (label) {
    // Check for existing file with same userId + label
    existingFile = await prisma.clientFile.findFirst({
      where: { userId, label },
    });
  }

  if (existingFile) {
    // Save old data as a FileVersion record
    await prisma.fileVersion.create({
      data: {
        fileId: existingFile.id,
        version: existingFile.version,
        filename: existingFile.filename,
        originalName: existingFile.originalName,
        size: existingFile.size,
      },
    });

    // Update the existing ClientFile with new data
    const updated = await prisma.clientFile.update({
      where: { id: existingFile.id },
      data: {
        filename,
        originalName: file.name,
        size: file.size,
        version: existingFile.version + 1,
        label: label ?? existingFile.label,
        folder: folder ?? existingFile.folder,
      },
    });

    createNotification(userId, "file_updated", "File updated", `A new version of "${updated.label || updated.originalName}" was uploaded`, "/files");

    return NextResponse.json(updated, { status: 200 });
  }

  const record = await prisma.clientFile.create({
    data: {
      userId,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      label: label ?? null,
      folder: folder ?? null,
    },
  });

  createNotification(userId, "file_shared", "New file shared", `"${record.label || record.originalName}" is now available`, "/files");

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fileId } = await req.json();
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const record = await prisma.clientFile.findUnique({ where: { id: fileId } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.clientFile.delete({ where: { id: fileId } });

  try {
    const { unlink } = await import("fs/promises");
    await unlink(path.join(UPLOADS_DIR, record.filename));
  } catch {}

  return NextResponse.json({ ok: true });
}
