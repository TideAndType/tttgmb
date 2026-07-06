import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status");

  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { opportunities: true } } },
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const contact = await prisma.contact.create({
    data: {
      userId,
      name: String(b.name).slice(0, 160),
      email: b.email || null,
      phone: b.phone || null,
      company: b.company || null,
      source: b.source || null,
      status: ["lead", "qualified", "customer", "lost"].includes(b.status) ? b.status : "lead",
      tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 20) : [],
      notes: b.notes || null,
    },
  });
  return NextResponse.json({ contact });
}
