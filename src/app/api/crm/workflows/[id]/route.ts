import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

const STEP_TYPES = ["send_email", "send_sms", "wait", "create_task", "add_tag", "notify"];

async function owned(id: string, userId: string) {
  const w = await prisma.workflow.findUnique({ where: { id } });
  return w && w.userId === userId ? w : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, userId },
    include: { steps: { orderBy: { position: "asc" } }, _count: { select: { enrollments: true } } },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

// Save the whole workflow, rewriting steps (simplest for a builder).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 140);
  if (["contact_created", "form_submitted", "booking_created", "manual"].includes(b.trigger)) data.trigger = b.trigger;
  if ("triggerConfig" in b) data.triggerConfig = b.triggerConfig || null;
  if (typeof b.enabled === "boolean") data.enabled = b.enabled;

  if (Array.isArray(b.steps)) {
    const steps = b.steps.filter((s: any) => STEP_TYPES.includes(s.type)).slice(0, 30);
    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { workflowId: params.id } }),
      ...steps.map((s: any, i: number) => prisma.workflowStep.create({ data: { workflowId: params.id, position: i, type: s.type, config: s.config || {} } })),
    ]);
  }

  const workflow = await prisma.workflow.update({ where: { id: params.id }, data, include: { steps: { orderBy: { position: "asc" } } } });
  return NextResponse.json({ workflow });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.workflow.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
