import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function checkAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (role !== "ADMIN" && project.userId !== userId) return null;
  return project;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; columnId: string; cardId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, dueDate, columnId, position, priority, label } = body;

  const card = await prisma.card.update({
    where: { id: params.cardId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(columnId !== undefined && { columnId }),
      ...(position !== undefined && { position }),
      ...(priority !== undefined && { priority: priority || null }),
      ...(label !== undefined && { label: label || null }),
    },
  });

  return NextResponse.json(card);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; columnId: string; cardId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.card.delete({ where: { id: params.cardId } });
  return NextResponse.json({ success: true });
}
