import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;
  const label = (formData.get("label") as string | null) || undefined;

  if (!file || !userId) {
    return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const filename = randomUUID() + ext;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(bytes));

  const record = await prisma.clientFile.create({
    data: {
      userId,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      label: label ?? null,
    },
  });

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
