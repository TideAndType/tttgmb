import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotification, createNotificationForAdmins } from "@/lib/notifications";

async function getProjectAndCheck(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (role !== "ADMIN" && project.userId !== userId) return null;
  return project;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await getProjectAndCheck(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { comments: true } }, links: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await getProjectAndCheck(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, body: messageBody, links } = body;

  if (!title || !messageBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      projectId: params.id,
      authorId: user.id,
      authorName: user.name || (user.role === "ADMIN" ? "Admin" : "Client"),
      title,
      body: messageBody,
    },
  });

  if (Array.isArray(links) && links.length > 0) {
    await prisma.messageLink.createMany({
      data: links
        .filter((l: { url?: string; label?: string }) => l.url && l.label)
        .map((l: { url: string; label: string }) => ({
          messageId: message.id,
          url: l.url,
          label: l.label,
        })),
    });
  }

  const messageWithLinks = await prisma.message.findUnique({
    where: { id: message.id },
    include: { links: true },
  });

  // Notify the other party of the new message board post
  const link = `/projects/${params.id}/messages/${message.id}`;
  const author = user.name || (user.role === "ADMIN" ? "Admin" : "Client");
  if (user.role === "ADMIN") {
    if (project.userId !== user.id) {
      createNotification(project.userId, "message_new", "New message", `${author} posted "${title}"`, link);
    }
  } else {
    createNotificationForAdmins("message_new", "New message", `${author} posted "${title}"`, link);
  }

  return NextResponse.json(messageWithLinks, { status: 201 });
}
