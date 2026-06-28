import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.cwd() + "/uploads";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const companyUserIds = await getCompanyUserIds(userId);
  const files = await prisma.brandAsset.findMany({
    where: { userId: { in: companyUserIds } },
    include: { _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    files: files.map((f) => ({ ...f, commentCount: f._count.comments })),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const companyUserIds = await getCompanyUserIds(userId);
  const asset = await prisma.brandAsset.findUnique({ where: { id } });

  if (!asset || !companyUserIds.includes(asset.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.brandAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(file.name) || "";
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const asset = await prisma.brandAsset.create({
      data: {
        userId,
        type: "FILE",
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json({ id: asset.id, filename }, { status: 201 });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
