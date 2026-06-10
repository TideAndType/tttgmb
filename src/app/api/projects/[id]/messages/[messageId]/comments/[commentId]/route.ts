import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; messageId: string; commentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const comment = await prisma.comment.findUnique({ where: { id: params.commentId } });

  if (!comment || comment.messageId !== params.messageId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "ADMIN" && comment.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.commentId } });
  return NextResponse.json({ success: true });
}
