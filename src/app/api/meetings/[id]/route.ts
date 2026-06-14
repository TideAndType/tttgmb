import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const meeting = await prisma.meeting.findUnique({ where: { id: params.id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "CLIENT") {
    const ids = await getCompanyUserIds(user.id);
    if (!ids.includes(meeting.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(meeting);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) data.endAt = new Date(body.endAt);
  if (body.location !== undefined) data.location = body.location;
  if (body.zoomLink !== undefined) data.zoomLink = body.zoomLink;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.status !== undefined) data.status = body.status;
  const meeting = await prisma.meeting.update({ where: { id: params.id }, data });
  return NextResponse.json(meeting);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.meeting.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
