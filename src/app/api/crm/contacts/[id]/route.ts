import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const c = await prisma.contact.findUnique({ where: { id } });
  return c && c.userId === userId ? c : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      opportunities: { include: { pipeline: { select: { name: true } }, stage: { select: { name: true, color: true } } } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const f of ["name", "email", "phone", "company", "source", "notes"]) if (f in b) data[f] = b[f] || null;
  if (b.status && ["lead", "qualified", "customer", "lost"].includes(b.status)) data.status = b.status;
  if (Array.isArray(b.tags)) data.tags = b.tags.map(String).slice(0, 20);
  const contact = await prisma.contact.update({ where: { id: params.id }, data });
  return NextResponse.json({ contact });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
