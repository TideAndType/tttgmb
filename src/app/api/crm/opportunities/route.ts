import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.title?.trim() || !b.pipelineId || !b.stageId) {
    return NextResponse.json({ error: "Title, pipeline and stage are required" }, { status: 400 });
  }
  // Verify pipeline + stage belong to this user.
  const stage = await prisma.crmStage.findFirst({ where: { id: b.stageId, pipeline: { is: { id: b.pipelineId, userId } } } });
  if (!stage) return NextResponse.json({ error: "Invalid pipeline/stage" }, { status: 400 });

  const count = await prisma.opportunity.count({ where: { stageId: b.stageId } });
  const opp = await prisma.opportunity.create({
    data: {
      userId, pipelineId: b.pipelineId, stageId: b.stageId,
      contactId: b.contactId || null,
      title: String(b.title).slice(0, 200),
      value: Number(b.value) || 0,
      position: count,
    },
    include: { contact: { select: { id: true, name: true, company: true } } },
  });
  return NextResponse.json({ opportunity: opp });
}
