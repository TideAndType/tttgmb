import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendLeadNotificationEmail } from "@/lib/email";
import { triggerWorkflows } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

// Public submission (no auth). Records the raw submission and — when enabled —
// creates a CRM contact mapped from the form's fields, then fires the
// lead-arrived automations.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await prisma.leadForm.findUnique({ where: { id: params.id } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data = body?.data && typeof body.data === "object" ? body.data : {};

  const fields = Array.isArray(form.fields) ? (form.fields as any[]) : [];
  // Basic required-field validation.
  for (const f of fields) {
    if (f.required && !String(data[f.id] ?? "").trim()) {
      return NextResponse.json({ error: `${f.label} is required.` }, { status: 400 });
    }
  }

  let contactId: string | null = null;
  if (form.createContact) {
    const mapped: Record<string, string> = {};
    for (const f of fields) if (f.mapTo && data[f.id]) mapped[f.mapTo] = String(data[f.id]);
    const name = mapped.name || mapped.email || "Website lead";
    const contact = await prisma.contact.create({
      data: {
        userId: form.userId,
        name: name.slice(0, 160),
        email: mapped.email || null,
        phone: mapped.phone || null,
        company: mapped.company || null,
        source: `Form: ${form.name}`,
        status: "lead",
        notes: fields.filter((f) => !f.mapTo && data[f.id]).map((f) => `${f.label}: ${data[f.id]}`).join("\n") || null,
      },
    });
    contactId = contact.id;

    // Notify the business (in-app + email) that a lead arrived.
    const base = process.env.NEXTAUTH_URL || "";
    await createNotification(form.userId, "lead", "New lead captured", `${contact.name} via ${form.name}`, "/crm/contacts");
    const owner = await prisma.user.findUnique({ where: { id: form.userId }, select: { email: true } });
    if (owner?.email) {
      await sendLeadNotificationEmail(owner.email, contact.name, contact.email, contact.phone, form.name, `${base}/crm/contacts/${contact.id}`);
    }
    await triggerWorkflows(form.userId, "contact_created", contact.id).catch(() => {});
    await triggerWorkflows(form.userId, "form_submitted", contact.id, { formId: form.id }).catch(() => {});
  }

  await prisma.formSubmission.create({ data: { formId: form.id, data, contactId } });
  return NextResponse.json({ success: true, redirectUrl: form.redirectUrl || null, message: form.successMessage });
}
