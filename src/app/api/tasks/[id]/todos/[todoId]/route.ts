import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; todoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  // Clients can toggle done; admins can also edit text
  const todo = await prisma.taskTodo.findUnique({
    where: { id: params.todoId },
    include: { task: { include: { assignees: true } } },
  });
  if (!todo || todo.taskId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    const isAssignee = todo.task.assignees.some((a) => a.userId === user.id);
    if (todo.task.userId !== user.id && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.done !== undefined) data.done = body.done;
  if (body.text !== undefined && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) data.text = body.text;

  const updated = await prisma.taskTodo.update({ where: { id: params.todoId }, data });
  return NextResponse.json({ todo: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; todoId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.taskTodo.delete({ where: { id: params.todoId } });
  return NextResponse.json({ success: true });
}
