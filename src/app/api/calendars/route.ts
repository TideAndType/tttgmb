import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const calendars = await prisma.calendar.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, color } = await req.json();
  const clean = String(name || "").trim();
  if (!clean) return NextResponse.json({ error: "Calendar name required" }, { status: 400 });
  const calendar = await prisma.calendar.create({ data: { name: clean, color: color || "#6366f1" } });
  return NextResponse.json({ calendar });
}
