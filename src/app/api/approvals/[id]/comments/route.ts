import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: params.id },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && deliverable.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { comment } = body;

  if (!comment?.trim()) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const newComment = await prisma.approvalComment.create({
    data: {
      deliverableId: params.id,
      authorId: user.id,
      authorName: user.name || "User",
      body: comment.trim(),
      action: null,
    },
  });

  return NextResponse.json({ comment: newComment }, { status: 201 });
}
