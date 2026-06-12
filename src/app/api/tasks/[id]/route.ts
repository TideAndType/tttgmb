import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskCompletedEmail } from "@/lib/email";

const assigneesInclude = {
  assignees: { include: { user: { select: { id: true, name: true } } } },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      links: true,
      _count: { select: { comments: true } },
      ...assigneesInclude,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Clients can only view their own tasks or tasks they are assigned to
  if (sessionUser.role !== "ADMIN") {
    const isAssignee = task.assignees.some((a) => a.userId === sessionUser.id);
    if (task.userId !== sessionUser.id && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ task: { ...task, commentCount: task._count.comments } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { assignees: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Clients can update status if they are the owner or an assignee
  if (sessionUser.role !== "ADMIN") {
    const isAssignee = task.assignees.some((a) => a.userId === sessionUser.id);
    if (task.userId !== sessionUser.id && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { status, visibleToClient, assigneeIds } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (visibleToClient !== undefined) updateData.visibleToClient = visibleToClient;

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: { ...assigneesInclude, links: true },
  });

  // Send completion emails when status transitions to COMPLETED
  if (status === "COMPLETED" && task.status !== "COMPLETED") {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [owner, admins] = await Promise.all([
      prisma.user.findUnique({
        where: { id: task.userId },
        select: { email: true, name: true, notifyTaskCompleted: true },
      }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true, name: true } }),
    ]);
    if (owner?.notifyTaskCompleted) {
      sendTaskCompletedEmail(owner.email, owner.name, task.title, `${baseUrl}/tasks`);
    }
    for (const admin of admins) {
      sendTaskCompletedEmail(admin.email, admin.name, task.title, `${baseUrl}/admin/tasks`);
    }
  }

  // Replace assignees if provided (admin only)
  if (Array.isArray(assigneeIds) && sessionUser.role === "ADMIN") {
    await prisma.taskAssignee.deleteMany({ where: { taskId: params.id } });
    const idsToAssign = new Set<string>([task.userId, ...assigneeIds.filter((id): id is string => typeof id === "string")]);
    await prisma.taskAssignee.createMany({
      data: Array.from(idsToAssign).map((uid) => ({ taskId: params.id, userId: uid })),
      skipDuplicates: true,
    });
    // Return fresh data
    const fresh = await prisma.task.findUnique({
      where: { id: params.id },
      include: { ...assigneesInclude, links: true },
    });
    return NextResponse.json({ task: fresh });
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
