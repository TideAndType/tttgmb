import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// "My Bar" — a personal hub of the signed-in user's assigned tasks, upcoming
// events, and bookmarks. Always scoped to the real session user (not an
// impersonated client) since it's a personal view.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [assigned, events, bookmarks] = await Promise.all([
    // Tasks owned by or assigned to the user that aren't done.
    prisma.task.findMany({
      where: {
        status: { not: "COMPLETED" },
        OR: [{ userId }, { assignees: { some: { userId } } }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        projectId: true,
        project: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    // Upcoming calendar events.
    prisma.calendarEvent.findMany({
      where: { date: { gte: startOfDay } },
      select: {
        id: true,
        title: true,
        date: true,
        calendar: { select: { name: true, color: true } },
      },
      orderBy: { date: "asc" },
      take: 25,
    }),
    prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ tasks: assigned, events, bookmarks });
}
