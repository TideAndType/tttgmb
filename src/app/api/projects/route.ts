import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCompanyUserIds } from "@/lib/company";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role === "ADMIN") {
    const projects = await prisma.project.findMany({
      include: {
        user: { select: { name: true, companyName: true } },
        _count: { select: { messages: true, cards: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    // Collapse ratings into an average + count for the admin list.
    const result = projects.map(({ ratings, ...p }) => ({
      ...p,
      ratingAvg: ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null,
      ratingCount: ratings.length,
    }));
    return NextResponse.json(result);
  }

  const companyUserIds = await getCompanyUserIds(user.id);
  const projects = await prisma.project.findMany({
    where: {
      userId: { in: companyUserIds },
      OR: [
        { visibility: "company" },
        { visibility: "private", memberIds: { has: user.id } },
        { userId: user.id },
      ],
    },
    include: {
      _count: { select: { messages: true, cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, userId, color, visibility, memberIds, status, startDate, dueDate, templateId } = body;

  if (!name || !userId) {
    return NextResponse.json({ error: "name and userId are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId,
      color: color || "#6366f1",
      visibility: visibility || "company",
      memberIds: memberIds || [],
      status: status || "active",
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  // If a template was chosen, clone its columns and cards into the new project.
  if (templateId) {
    const template = await prisma.projectTemplate.findUnique({ where: { id: templateId } });
    const structure = template?.structure as { columns?: any[] } | null;
    if (structure?.columns?.length) {
      for (let colIdx = 0; colIdx < structure.columns.length; colIdx++) {
        const col = structure.columns[colIdx];
        const column = await prisma.cardColumn.create({
          data: { projectId: project.id, name: col.name || "Column", position: col.position ?? colIdx },
        });
        if (Array.isArray(col.cards) && col.cards.length) {
          await prisma.card.createMany({
            data: col.cards.map((c: any, cardIdx: number) => ({
              columnId: column.id,
              projectId: project.id,
              title: c.title || "Untitled",
              description: c.description ?? null,
              priority: c.priority ?? null,
              label: c.label ?? null,
              position: c.position ?? cardIdx,
            })),
          });
        }
      }
    }
  }

  return NextResponse.json(project, { status: 201 });
}
