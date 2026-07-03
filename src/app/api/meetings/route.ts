import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { getAgencyScope } from "@/lib/agency-scope";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const where: any = {};
  if (upcoming) where.startAt = { gte: new Date() };

  if (user.role === "CLIENT") {
    const ids = await getCompanyUserIds(user.id);
    where.userId = { in: ids };
  } else {
    const scope = await getAgencyScope(session);
    const filterUserId = searchParams.get("userId");
    if (scope.clientUserIds !== null) {
      where.userId = filterUserId && scope.clientUserIds.includes(filterUserId) ? filterUserId : { in: scope.clientUserIds };
    } else if (filterUserId) {
      where.userId = filterUserId;
    }
  }

  const meetings = await prisma.meeting.findMany({ where, orderBy: { startAt: "asc" }, take: limit });
  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const meeting = await prisma.meeting.create({
    data: {
      userId: body.userId,
      title: body.title,
      description: body.description ?? null,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      location: body.location ?? null,
      zoomLink: body.zoomLink ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "scheduled",
    },
  });
  return NextResponse.json(meeting, { status: 201 });
}
