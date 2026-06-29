import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

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

  // Stored calendar events (with their calendar/layer).
  const events = await prisma.calendarEvent.findMany({
    orderBy: { date: "asc" },
    include: { calendar: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json({ tasks, cards, events });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { calendarId, title, date, description } = await req.json();
  if (!calendarId || !title || !date) {
    return NextResponse.json({ error: "calendarId, title and date are required" }, { status: 400 });
  }
  const event = await prisma.calendarEvent.create({
    data: { calendarId, title: String(title).trim(), date: new Date(date), description: description || null },
    include: { calendar: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json({ event }, { status: 201 });
}
