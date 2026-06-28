import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTaskCompletedEmail } from "@/lib/email";
import { createNotification, createNotificationForAdmins } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const assigneesInclude = {
  assignees: { include: { user: { select: { id: true, name: true } } } },
};

function advanceDate(from: Date, recurrence: string): Date {
  const next = new Date(from);
  if (recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

// When a recurring task is completed, create its next occurrence.
async function spawnNextOccurrence(task: {
  id: string; userId: string; title: string; description: string | null;
  priority: string; dueDate: Date | null; visibleToClient: boolean;
  color: string | null; tags: string[]; recurrence: string | null;
}): Promise<void> {
  if (!task.recurrence) return;
  // Advance from the existing due date, or from now if the task had none.
  const baseDate = task.dueDate ?? new Date();
  const nextDue = advanceDate(baseDate, task.recurrence);

  const next = await prisma.task.create({
    data: {
      userId: task.userId,
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      dueDate: nextDue,
      visibleToClient: task.visibleToClient,
      color: task.color,
      tags: task.tags,
      recurrence: task.recurrence,
    },
  });

  // Copy assignees from the completed task to the new occurrence.
  const assignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id }, select: { userId: true } });
  const ids = new Set<string>([task.userId, ...assignees.map((a) => a.userId)]);
  await prisma.taskAssignee.createMany({
    data: Array.from(ids).map((uid) => ({ taskId: next.id, userId: uid })),
    skipDuplicates: true,
  });
}

const todosInclude = {
  todos: { orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }] },
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
      ...todosInclude,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Clients can only view their own tasks or tasks they are assigned to
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
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
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    const isAssignee = task.assignees.some((a) => a.userId === sessionUser.id);
    if (task.userId !== sessionUser.id && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { status, visibleToClient, assigneeIds, color, tags } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (visibleToClient !== undefined) updateData.visibleToClient = visibleToClient;
  if (color !== undefined) updateData.color = color || null;
  if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: { ...assigneesInclude, ...todosInclude, links: true },
  });

  // Send completion emails + in-app notifications when status → COMPLETED
  if (status === "COMPLETED" && task.status !== "COMPLETED") {
    // Recurring tasks spawn their next occurrence on completion.
    if (task.recurrence) {
      await spawnNextOccurrence(task);
    }
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const [owner, admins] = await Promise.all([
      prisma.user.findUnique({
        where: { id: task.userId },
        select: { email: true, name: true, notifyTaskCompleted: true },
      }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } }),
    ]);
    if (owner?.notifyTaskCompleted) {
      sendTaskCompletedEmail(owner.email, owner.name, task.title, `${baseUrl}/tasks`);
    }
    createNotification(task.userId, "task_completed", "Task completed", task.title, "/tasks");
    dispatchWebhook("task.completed", { id: task.id, title: task.title, clientId: task.userId });
    for (const admin of admins) {
      sendTaskCompletedEmail(admin.email, admin.name, task.title, `${baseUrl}/admin/tasks`);
      createNotification(admin.id, "task_completed", "Task marked complete", task.title, "/admin/tasks");
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
      include: { ...assigneesInclude, ...todosInclude, links: true },
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
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
