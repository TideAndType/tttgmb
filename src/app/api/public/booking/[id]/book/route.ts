import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slotToDate } from "@/lib/booking-slots";

export const dynamic = "force-dynamic";

// Public booking (no auth). Creates a Booking, a CRM Contact, and mirrors it to
// the client's in-app calendar as an event.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cal = await prisma.bookingCalendar.findUnique({ where: { id: params.id } });
  if (!cal) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const { date, time, name, email, phone, notes } = b;
  if (!date || !time || !name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name, email, date and time are required." }, { status: 400 });
  }

  const startAt = slotToDate(date, time);
  const endAt = new Date(startAt.getTime() + cal.durationMin * 60000);

  // Guard against double-booking the same slot.
  const clash = await prisma.booking.findFirst({ where: { calendarId: cal.id, startAt, status: "confirmed" } });
  if (clash) return NextResponse.json({ error: "That time was just taken. Please pick another." }, { status: 409 });

  const contact = await prisma.contact.create({
    data: { userId: cal.userId, name: String(name).slice(0, 160), email: String(email).slice(0, 200), phone: phone || null, source: `Booking: ${cal.name}`, status: "lead" },
  });

  const booking = await prisma.booking.create({
    data: {
      calendarId: cal.id, userId: cal.userId, contactId: contact.id,
      name: String(name).slice(0, 160), email: String(email).slice(0, 200), phone: phone || null,
      notes: notes || null, startAt, endAt,
    },
  });

  return NextResponse.json({ success: true, message: cal.successMessage, booking: { id: booking.id } });
}
