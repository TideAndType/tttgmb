import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin(u)) {
    const ids = await getCompanyUserIds(u.id);
    if (!ids.includes(project.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milestones = await prisma.milestone.findMany({ where: { projectId: params.id }, orderBy: { date: "asc" } });
  return NextResponse.json({ milestones });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin((session?.user as any))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, date } = await req.json();
  if (!title?.trim() || !date) return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  const milestone = await prisma.milestone.create({
    data: { projectId: params.id, title: title.trim(), date: new Date(date) },
  });
  return NextResponse.json({ milestone }, { status: 201 });
}
