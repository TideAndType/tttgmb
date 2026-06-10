import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskCreatedEmail } from "@/lib/email";
import { cookies } from "next/headers";
import { getCompanyUserIds } from "@/lib/company";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  if (user.role === "ADMIN") {
    const cookieStore = cookies();
    const viewing = cookieStore.get("adminViewingAs");
    if (viewing?.value) {
      // Impersonating — show only that client's tasks
      const tasks = await prisma.task.findMany({
        where: { userId: viewing.value },
        include: { _count: { select: { comments: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      });
      return NextResponse.json({
        tasks: tasks.map((t) => ({ ...t, commentCount: t._count.comments })),
      });
    }

    // Not impersonating — return all tasks
    const tasks = await prisma.task.findMany({
      include: {
        user: { select: { id: true, name: true, companyName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      tasks: tasks.map((t) => ({ ...t, commentCount: t._count.comments })),
    });
  }

  // CLIENT: all tasks for their company
  const companyUserIds = await getCompanyUserIds(user.id);
  const tasks = await prisma.task.findMany({
    where: { userId: { in: companyUserIds } },
    include: { _count: { select: { comments: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({ ...t, commentCount: t._count.comments })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, priority, dueDate } = body;
  let { userId } = body;

  // If impersonating, use the impersonated client's userId
  const cookieStore = cookies();
  const viewing = cookieStore.get("adminViewingAs");
  if (viewing?.value) {
    userId = viewing.value;
  }

  if (!userId || !title) {
    return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  try {
    const clientUser = await prisma.user.findUnique({ where: { id: userId } });
    if (clientUser) {
      const portalUrl = `${process.env.NEXTAUTH_URL || ""}/tasks`;
      await sendTaskCreatedEmail(
        clientUser.email,
        clientUser.name,
        title,
        description || null,
        dueDate ? new Date(dueDate) : null,
        portalUrl
      );
    }
  } catch (err) {
    console.error("Email notification failed:", err);
  }

  return NextResponse.json({ task }, { status: 201 });
}
