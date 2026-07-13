import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const o = await prisma.opportunity.findUnique({ where: { id } });
  return o && o.userId === userId ? o : null;
}

// Move between stages, change value/title, or mark won/lost.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await owned(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (b.stageId && b.stageId !== existing.stageId) {
    const stage = await prisma.crmStage.findFirst({ where: { id: b.stageId, pipeline: { is: { userId } } } });
    if (!stage) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    data.stageId = b.stageId;
    if (typeof b.position === "number") data.position = b.position;
  } else if (typeof b.position === "number") {
    data.position = b.position;
  }
  if (typeof b.title === "string" && b.title.trim()) data.title = b.title.slice(0, 200);
  if (b.value !== undefined) data.value = Number(b.value) || 0;
  if (b.contactId !== undefined) data.contactId = b.contactId || null;
  if (b.status && ["open", "won", "lost"].includes(b.status)) data.status = b.status;

  const opportunity = await prisma.opportunity.update({
    where: { id: params.id }, data,
    include: { contact: { select: { id: true, name: true, company: true, phone: true, email: true } } },
  });
  return NextResponse.json({ opportunity });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.opportunity.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
