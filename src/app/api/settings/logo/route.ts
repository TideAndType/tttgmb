import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.cwd() + "/uploads";

const DEFAULTS = {
  id: "singleton" as const,
  appName: "Client Portal",
  logoFilename: null,
  primaryColor: "#2dd4bf",
  accentColor: "#6366f1",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Remove old logo file if exists
    const existing = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (existing?.logoFilename) {
      try {
        await unlink(path.join(UPLOADS_DIR, existing.logoFilename));
      } catch {}
    }

    const ext = path.extname(file.name) || ".png";
    const filename = `app-logo-${randomUUID()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: { logoFilename: filename },
      create: { ...DEFAULTS, logoFilename: filename },
    });

    return NextResponse.json({ filename });
  } catch (error) {
    console.error("App logo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (existing?.logoFilename) {
    try {
      await unlink(path.join(UPLOADS_DIR, existing.logoFilename));
    } catch {}
    await prisma.appSettings.update({
      where: { id: "singleton" },
      data: { logoFilename: null },
    });
  }

  return NextResponse.json({ success: true });
}
