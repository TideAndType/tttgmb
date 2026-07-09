import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

// Format a Date as an all-day iCal DATE value (YYYYMMDD).
function icalDate(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Public iCal feed, authenticated by a per-user token (?token=). Emits stored
// calendar events (with multi-day DTEND and weekly/monthly RRULE) plus the
// user's visible task due dates. Meant to be subscribed to in Google/Apple
// Calendar, so it must not rely on the session cookie.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new NextResponse("Missing token", { status: 401 });

  const user = await prisma.user.findUnique({ where: { icalToken: token }, select: { id: true } });
  if (!user) return new NextResponse("Invalid token", { status: 401 });

  const companyUserIds = await getCompanyUserIds(user.id);

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({ include: { calendar: { select: { name: true } } } }),
    prisma.task.findMany({
      where: { userId: { in: companyUserIds }, dueDate: { not: null }, visibleToClient: true },
      select: { id: true, title: true, dueDate: true },
    }),
  ]);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HarborHQ//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HarborHQ",
  ];

  const stamp = icalDate(new Date()) + "T000000Z";

  for (const e of events) {
    const start = new Date(e.date);
    // All-day DTEND is exclusive, so add one day; multi-day uses endDate + 1.
    const endBase = e.endDate ? new Date(e.endDate) : new Date(e.date);
    const end = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${e.id}@harborhq`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${icalDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${icalDate(end)}`);
    if (e.recurrence === "weekly") lines.push("RRULE:FREQ=WEEKLY");
    else if (e.recurrence === "monthly") lines.push("RRULE:FREQ=MONTHLY");
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.calendar?.name) lines.push(`CATEGORIES:${escapeText(e.calendar.name)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }

  for (const t of tasks) {
    if (!t.dueDate) continue;
    const d = new Date(t.dueDate);
    const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:task-${t.id}@harborhq`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${icalDate(d)}`);
    lines.push(`DTEND;VALUE=DATE:${icalDate(end)}`);
    lines.push(`SUMMARY:${escapeText("Due: " + t.title)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="harborhq.ics"',
    },
  });
}
