import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getTaskAndCheckAccess(taskId: string, userId: string, role: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true },
  });
  if (!task) return null;
  if (role !== "ADMIN") {
    const isAssignee = task.assignees.some((a) => a.userId === userId);
    if (task.userId !== userId && !isAssignee) return null;
  }
  return task;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const task = await getTaskAndCheckAccess(params.id, user.id, user.role);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const todos = await prisma.taskTodo.findMany({
    where: { taskId: params.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const count = await prisma.taskTodo.count({ where: { taskId: params.id } });
  const todo = await prisma.taskTodo.create({
    data: { taskId: params.id, text: text.trim(), position: count },
  });
  return NextResponse.json({ todo }, { status: 201 });
}
