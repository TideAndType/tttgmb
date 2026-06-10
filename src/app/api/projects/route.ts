import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role === "ADMIN") {
    const projects = await prisma.project.findMany({
      include: {
        user: { select: { name: true, companyName: true } },
        _count: { select: { messages: true, cards: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
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
  const { name, description, userId, color } = body;

  if (!name || !userId) {
    return NextResponse.json({ error: "name and userId are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { name, description, userId, color: color || "#6366f1" },
  });

  return NextResponse.json(project, { status: 201 });
}
