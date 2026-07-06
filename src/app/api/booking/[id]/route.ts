import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const c = await prisma.bookingCalendar.findUnique({ where: { id } });
  return c && c.userId === userId ? c : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const calendar = await prisma.bookingCalendar.findFirst({
    where: { id: params.id, userId },
    include: { bookings: { orderBy: { startAt: "asc" }, where: { status: "confirmed" } } },
  });
  if (!calendar) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ calendar });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 120);
  if ("description" in b) data.description = b.description || null;
  if (b.durationMin !== undefined) data.durationMin = Math.max(5, Math.min(480, Number(b.durationMin) || 30));
  if (b.bufferMin !== undefined) data.bufferMin = Math.max(0, Math.min(120, Number(b.bufferMin) || 0));
  if (typeof b.timezone === "string") data.timezone = b.timezone;
  if (b.availability) data.availability = b.availability;
  if (b.leadDays !== undefined) data.leadDays = Math.max(1, Math.min(90, Number(b.leadDays) || 14));
  if (typeof b.accentColor === "string") data.accentColor = b.accentColor;
  if (typeof b.successMessage === "string") data.successMessage = b.successMessage.slice(0, 400);
  const calendar = await prisma.bookingCalendar.update({ where: { id: params.id }, data });
  return NextResponse.json({ calendar });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.bookingCalendar.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
