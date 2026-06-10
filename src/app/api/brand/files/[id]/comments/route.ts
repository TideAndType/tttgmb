import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;

  const asset = await prisma.brandAsset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (sessionUser.role !== "ADMIN" && asset.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.fileComment.findMany({
    where: { assetId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;

  const asset = await prisma.brandAsset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (sessionUser.role !== "ADMIN" && asset.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { body: commentBody } = body;

  if (!commentBody || !commentBody.trim()) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const comment = await prisma.fileComment.create({
    data: {
      assetId: params.id,
      authorId: sessionUser.id,
      authorName: sessionUser.name || "Unknown",
      body: commentBody.trim(),
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
