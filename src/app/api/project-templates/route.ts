import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await prisma.projectTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, fromProjectId, structure } = body;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  let resolvedStructure = structure;

  // Build the structure from an existing project's columns + cards.
  if (fromProjectId) {
    const columns = await prisma.cardColumn.findMany({
      where: { projectId: fromProjectId },
      orderBy: { position: "asc" },
      include: { cards: { orderBy: { position: "asc" } } },
    });
    resolvedStructure = {
      columns: columns.map((col) => ({
        name: col.name,
        position: col.position,
        cards: col.cards.map((c) => ({
          title: c.title,
          description: c.description,
          priority: c.priority,
          label: c.label,
          position: c.position,
        })),
      })),
    };
  }

  const template = await prisma.projectTemplate.create({
    data: {
      name,
      description: description || null,
      structure: resolvedStructure ?? { columns: [] },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
