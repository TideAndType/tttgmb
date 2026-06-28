import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotification, createNotificationForAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && project.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.comment.findMany({
    where: { messageId: params.messageId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && project.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { body: commentBody } = body;

  if (!commentBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      messageId: params.messageId,
      authorId: user.id,
      authorName: user.name || ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Admin" : "Client"),
      body: commentBody,
    },
  });

  // Notify the other party of the new reply
  const message = await prisma.message.findUnique({ where: { id: params.messageId }, select: { title: true } });
  const link = `/projects/${params.id}/messages/${params.messageId}`;
  const author = user.name || ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? "Admin" : "Client");
  const desc = `${author} replied${message?.title ? ` on "${message.title}"` : ""}`;
  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    if (project.userId !== user.id) {
      createNotification(project.userId, "comment_new", "New reply", desc, link);
    }
  } else {
    createNotificationForAdmins("comment_new", "New reply", desc, link);
  }

  return NextResponse.json(comment, { status: 201 });
}
