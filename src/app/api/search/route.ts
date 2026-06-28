import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ tasks: [], proposals: [], messages: [], projects: [] });

  const isAdmin = (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const userFilter = isAdmin ? undefined : { in: await getCompanyUserIds(user.id) };

  const [tasks, proposals, messages, projects] = await Promise.all([
    prisma.task.findMany({
      where: { title: { contains: q, mode: "insensitive" }, ...(userFilter ? { userId: userFilter } : {}) },
      select: { id: true, title: true, status: true, userId: true },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: { title: { contains: q, mode: "insensitive" }, ...(userFilter ? { userId: userFilter } : {}) },
      select: { id: true, title: true, status: true, userId: true },
      take: 5,
    }),
    prisma.message.findMany({
      where: {
        OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }],
        ...(userFilter ? { project: { userId: userFilter } } : {}),
      },
      select: { id: true, title: true, projectId: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" }, ...(userFilter ? { userId: userFilter } : {}) },
      select: { id: true, name: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ tasks, proposals, messages, projects });
}
