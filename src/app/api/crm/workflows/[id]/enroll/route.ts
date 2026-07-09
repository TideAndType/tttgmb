import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";
import { processEnrollment } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

// Manually enroll a contact into a workflow (any trigger). Runs immediate steps
// inline; delayed steps advance via the cron.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await prisma.workflow.findFirst({ where: { id: params.id, userId }, include: { steps: true } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workflow.steps.length === 0) return NextResponse.json({ error: "This workflow has no steps yet." }, { status: 400 });

  const { contactId } = await req.json().catch(() => ({}));
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const existing = await prisma.workflowEnrollment.findFirst({ where: { workflowId: workflow.id, contactId: contact.id, status: "active" } });
  if (existing) return NextResponse.json({ error: "This contact is already in that workflow." }, { status: 409 });

  const enrollment = await prisma.workflowEnrollment.create({ data: { workflowId: workflow.id, contactId: contact.id, nextRunAt: new Date() } });
  await processEnrollment(enrollment.id).catch((e) => console.error("[Workflow] manual enroll failed:", e));
  return NextResponse.json({ success: true });
}
