import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (user.role === "ADMIN") {
    const allEntries = await prisma.timeEntry.findMany({
      include: {
        user: { select: { id: true, name: true, companyName: true } },
      },
    });

    const byClient: Record<string, { userId: string; userName: string; companyName: string | null; minutes: number }> = {};
    let totalMinutes = 0;

    for (const entry of allEntries) {
      totalMinutes += entry.minutes;
      if (!byClient[entry.userId]) {
        byClient[entry.userId] = {
          userId: entry.userId,
          userName: entry.user.name,
          companyName: entry.user.companyName,
          minutes: 0,
        };
      }
      byClient[entry.userId].minutes += entry.minutes;
    }

    const thisMonthEntries = allEntries.filter((e) => e.date >= startOfMonth);
    const thisMonth = thisMonthEntries.reduce((sum, e) => sum + e.minutes, 0);

    return NextResponse.json({
      totalMinutes,
      thisMonth,
      byClient: Object.values(byClient).sort((a, b) => b.minutes - a.minutes),
    });
  }

  // CLIENT
  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id },
    include: {
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const thisMonth = entries
    .filter((e) => e.date >= startOfMonth)
    .reduce((sum, e) => sum + e.minutes, 0);

  const byProjectMap: Record<string, { projectId: string; projectName: string; minutes: number }> = {};
  const byTaskMap: Record<string, { taskId: string; taskTitle: string; minutes: number }> = {};

  for (const entry of entries) {
    if (entry.projectId && entry.project) {
      if (!byProjectMap[entry.projectId]) {
        byProjectMap[entry.projectId] = { projectId: entry.projectId, projectName: entry.project.name, minutes: 0 };
      }
      byProjectMap[entry.projectId].minutes += entry.minutes;
    }
    if (entry.taskId && entry.task) {
      if (!byTaskMap[entry.taskId]) {
        byTaskMap[entry.taskId] = { taskId: entry.taskId, taskTitle: entry.task.title, minutes: 0 };
      }
      byTaskMap[entry.taskId].minutes += entry.minutes;
    }
  }

  return NextResponse.json({
    totalMinutes,
    thisMonth,
    byProject: Object.values(byProjectMap).sort((a, b) => b.minutes - a.minutes),
    byTask: Object.values(byTaskMap).sort((a, b) => b.minutes - a.minutes),
  });
}
