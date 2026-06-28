import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (role !== "ADMIN" && project.userId !== userId) return null;
  return project;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string; columnId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await prisma.card.findMany({
    where: { columnId: params.columnId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(cards);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string; columnId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, dueDate } = body;

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const maxPos = await prisma.card.aggregate({
    where: { columnId: params.columnId },
    _max: { position: true },
  });

  const card = await prisma.card.create({
    data: {
      columnId: params.columnId,
      projectId: params.id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(card, { status: 201 });
}
