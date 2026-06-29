import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

// Total minutes logged for a client's work (their projects + their tasks),
// regardless of which agency member logged it. Admin-only — used by invoicing.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const companyUserIds = await getCompanyUserIds(clientId);
  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true } }),
    prisma.task.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true } }),
  ]);
  const projectIds = projects.map((p) => p.id);
  const taskIds = tasks.map((t) => t.id);

  const or: any[] = [];
  if (projectIds.length) or.push({ projectId: { in: projectIds } });
  if (taskIds.length) or.push({ taskId: { in: taskIds } });
  if (or.length === 0) return NextResponse.json({ minutes: 0, hours: 0 });

  const agg = await prisma.timeEntry.aggregate({ _sum: { minutes: true }, where: { OR: or } });
  const minutes = agg._sum.minutes ?? 0;
  return NextResponse.json({ minutes, hours: Number((minutes / 60).toFixed(2)) });
}
