import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const companyUserIds = await getCompanyUserIds(user.id);

  const [tasks, cards] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: { in: companyUserIds },
        dueDate: { not: null },
        visibleToClient: true,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
      },
    }),
    prisma.card.findMany({
      where: {
        project: { userId: { in: companyUserIds } },
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        createdAt: true,
        project: { select: { id: true, name: true, color: true } },
      },
    }),
  ]);

  return NextResponse.json({ tasks, cards });
}
