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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const columns = await prisma.cardColumn.findMany({
    where: { projectId: params.id },
    include: { cards: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(columns);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const project = await checkAccess(params.id, user.id, user.role);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const maxPos = await prisma.cardColumn.aggregate({
    where: { projectId: params.id },
    _max: { position: true },
  });

  const column = await prisma.cardColumn.create({
    data: {
      projectId: params.id,
      name,
      position: (maxPos._max.position ?? -1) + 1,
    },
    include: { cards: true },
  });

  return NextResponse.json(column, { status: 201 });
}
