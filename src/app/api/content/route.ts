import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.scheduledAt = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const items = await prisma.contentItem.findMany({ where, orderBy: { scheduledAt: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, type, status, scheduledAt, notes, url, tags } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const item = await prisma.contentItem.create({
    data: {
      userId: user.id,
      title,
      type: type || "OTHER",
      status: status || "IDEA",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes || null,
      url: url || null,
      tags: tags || [],
    },
  });
  return NextResponse.json(item, { status: 201 });
}
