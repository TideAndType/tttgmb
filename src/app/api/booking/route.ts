import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

const DEFAULT_AVAILABILITY = {
  mon: [{ start: "09:00", end: "17:00" }],
  tue: [{ start: "09:00", end: "17:00" }],
  wed: [{ start: "09:00", end: "17:00" }],
  thu: [{ start: "09:00", end: "17:00" }],
  fri: [{ start: "09:00", end: "17:00" }],
};

export async function GET() {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const calendars = await prisma.bookingCalendar.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const calendar = await prisma.bookingCalendar.create({
    data: {
      userId,
      name: (b.name?.trim() || "Book a Call").slice(0, 120),
      durationMin: Number(b.durationMin) || 30,
      availability: b.availability || DEFAULT_AVAILABILITY,
    },
  });
  return NextResponse.json({ calendar });
}
