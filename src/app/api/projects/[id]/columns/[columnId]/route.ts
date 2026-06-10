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
  { params }: { params: { id: string; columnId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const column = await prisma.cardColumn.update({
    where: { id: params.columnId },
    data: { name: body.name },
  });

  return NextResponse.json(column);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; columnId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cardColumn.delete({ where: { id: params.columnId } });
  return NextResponse.json({ success: true });
}
