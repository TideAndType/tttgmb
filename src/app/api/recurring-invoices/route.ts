import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const schedules = await prisma.recurringInvoice.findMany({ orderBy: { createdAt: "desc" } });
  const userIds = Array.from(new Set(schedules.map((s) => s.userId)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, companyName: true } });
  const nameById = new Map(users.map((u) => [u.id, u.companyName || u.name]));
  return NextResponse.json(schedules.map((s) => ({ ...s, clientName: nameById.get(s.userId) ?? "Unknown" })));
}
