import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlots, Availability } from "@/lib/booking-slots";

export const dynamic = "force-dynamic";

// Public: calendar meta + available slots for the embed page (no auth).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cal = await prisma.bookingCalendar.findUnique({ where: { id: params.id } });
  if (!cal) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const booked = await prisma.booking.findMany({
    where: { calendarId: cal.id, status: "confirmed", startAt: { gte: new Date() } },
    select: { startAt: true },
  });
  const days = generateSlots(cal.availability as unknown as Availability, cal.durationMin, cal.bufferMin, cal.leadDays, booked);

  return NextResponse.json({
    calendar: { id: cal.id, name: cal.name, description: cal.description, durationMin: cal.durationMin, timezone: cal.timezone, accentColor: cal.accentColor, successMessage: cal.successMessage },
    days,
  });
}
