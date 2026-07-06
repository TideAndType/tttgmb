import { prisma } from "@/lib/prisma";
import { getAgencySender } from "@/lib/agency-email";
import { getIntegrationForUser } from "@/lib/agency-integrations";
import { sendSms } from "@/lib/twilio";
import { renderMarkdown } from "@/lib/markdown";
import { createNotification } from "@/lib/notifications";

export type WorkflowTrigger = "contact_created" | "form_submitted" | "booking_created" | "manual";

// Enroll a contact into every enabled workflow matching a trigger, then process
// immediate (non-wait) steps inline. Delayed steps advance via the cron.
export async function triggerWorkflows(userId: string, trigger: WorkflowTrigger, contactId: string, meta: { formId?: string } = {}) {
  if (!contactId) return;
  const workflows = await prisma.workflow.findMany({ where: { userId, trigger, enabled: true }, include: { steps: true } });
  for (const wf of workflows) {
    if (trigger === "form_submitted") {
      const wantForm = (wf.triggerConfig as any)?.formId;
      if (wantForm && wantForm !== meta.formId) continue;
    }
    if (wf.steps.length === 0) continue;
    // Avoid re-enrolling the same contact in the same workflow while active.
    const already = await prisma.workflowEnrollment.findFirst({ where: { workflowId: wf.id, contactId, status: "active" } });
    if (already) continue;
    const enrollment = await prisma.workflowEnrollment.create({ data: { workflowId: wf.id, contactId, currentStep: 0, nextRunAt: new Date() } });
    await processEnrollment(enrollment.id).catch((e) => console.error("[Workflow] enroll process failed:", e));
  }
}

// Advance one enrollment: run steps until a wait defers it or it completes.
export async function processEnrollment(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.workflowEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { workflow: { include: { steps: { orderBy: { position: "asc" } } } } },
  });
  if (!enrollment || enrollment.status !== "active") return;

  const contact = await prisma.contact.findUnique({ where: { id: enrollment.contactId } });
  if (!contact) { await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { status: "cancelled" } }); return; }

  const steps = enrollment.workflow.steps;
  let idx = enrollment.currentStep;

  while (idx < steps.length) {
    const step = steps[idx];
    const cfg = (step.config as Record<string, any>) || {};

    if (step.type === "wait") {
      const minutes = Math.max(1, Number(cfg.minutes) || 60);
      await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStep: idx + 1, nextRunAt: new Date(Date.now() + minutes * 60000) } });
      return; // defer remaining steps to the cron
    }

    await runStep(enrollment.workflow.userId, step.type, cfg, contact).catch((e) => console.error(`[Workflow] step ${step.type} failed:`, e));
    idx++;
  }

  await prisma.workflowEnrollment.update({ where: { id: enrollmentId }, data: { currentStep: idx, status: "done" } });
}

async function runStep(userId: string, type: string, cfg: Record<string, any>, contact: { id: string; name: string; email: string | null; phone: string | null; tags: string[] }) {
  switch (type) {
    case "send_email": {
      if (!contact.email) return;
      const sender = await getAgencySender(userId);
      if (!sender) return;
      await sender.send(contact.email, String(cfg.subject || "").slice(0, 200), renderMarkdown(String(cfg.body || "")));
      await prisma.contactActivity.create({ data: { contactId: contact.id, type: "email", body: `📧 Workflow email: ${cfg.subject || ""}`, authorName: "Workflow" } });
      return;
    }
    case "send_sms": {
      if (!contact.phone) return;
      const i = await getIntegrationForUser(userId);
      if (!i?.twilioAccountSid || !i?.twilioAuthToken || !i?.twilioFromNumber) return;
      await sendSms({ accountSid: i.twilioAccountSid, authToken: i.twilioAuthToken, fromNumber: i.twilioFromNumber }, contact.phone, String(cfg.body || ""));
      await prisma.smsMessage.create({ data: { userId, contactId: contact.id, direction: "outbound", fromNumber: i.twilioFromNumber, toNumber: contact.phone, body: String(cfg.body || "").slice(0, 1600), status: "sent" } });
      return;
    }
    case "create_task": {
      await prisma.marketingTask.create({ data: { userId, title: String(cfg.title || `Follow up with ${contact.name}`).slice(0, 200), category: "leadgen", source: "ai", instructions: `Contact: ${contact.name}${contact.email ? ` (${contact.email})` : ""}` } });
      return;
    }
    case "add_tag": {
      const tag = String(cfg.tag || "").trim();
      if (!tag || contact.tags.includes(tag)) return;
      await prisma.contact.update({ where: { id: contact.id }, data: { tags: { set: [...contact.tags, tag] } } });
      return;
    }
    case "notify": {
      await createNotification(userId, "workflow", "Workflow", String(cfg.message || `Workflow step for ${contact.name}`), `/crm/contacts/${contact.id}`);
      return;
    }
  }
}

// Process all enrollments whose next step is due (called by the cron).
export async function runDueWorkflows(limit = 200): Promise<number> {
  const due = await prisma.workflowEnrollment.findMany({
    where: { status: "active", nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: "asc" }, take: limit, select: { id: true },
  });
  for (const e of due) await processEnrollment(e.id).catch((err) => console.error("[Workflow] due process failed:", err));
  return due.length;
}
