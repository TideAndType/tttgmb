import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { phonesMatch, normalizePhone } from "@/lib/twilio";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Inbound SMS from Twilio (form-encoded). Point each agency's Twilio number
// "A message comes in" webhook here. We match the destination number to the
// agency, then the sender to a contact, and store the message. Responds with
// empty TwiML so Twilio doesn't send an auto-reply.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const from = String(form.get("From") || "");
  const to = String(form.get("To") || "");
  const body = String(form.get("Body") || "");
  const sid = String(form.get("MessageSid") || "");
  const twiml = new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { "Content-Type": "text/xml" } });
  if (!from || !to) return twiml;

  // Find the agency that owns this receiving number.
  const toDigits = normalizePhone(to).slice(-10);
  const integrations = await prisma.agencyIntegration.findMany({ where: { twilioFromNumber: { not: null } }, select: { agencyId: true, twilioFromNumber: true } });
  const match = integrations.find((i) => normalizePhone(i.twilioFromNumber || "").slice(-10) === toDigits);
  if (!match) return twiml;

  // Find a contact with this sender's phone within the agency's clients.
  const members = await prisma.user.findMany({ where: { agencyId: match.agencyId }, select: { id: true } });
  const memberIds = members.map((m) => m.id);
  const candidates = await prisma.contact.findMany({ where: { userId: { in: memberIds }, phone: { not: null } } });
  const contact = candidates.find((c) => c.phone && phonesMatch(c.phone, from)) || null;

  // Owning client account: the matched contact's, else the agency owner.
  let ownerId = contact?.userId;
  if (!ownerId) {
    const owner = await prisma.agency.findUnique({ where: { id: match.agencyId }, select: { ownerId: true } });
    ownerId = owner?.ownerId || memberIds[0];
  }
  if (!ownerId) return twiml;

  await prisma.smsMessage.create({
    data: { userId: ownerId, contactId: contact?.id || null, direction: "inbound", fromNumber: from, toNumber: to, body: body.slice(0, 1600), status: "received", twilioSid: sid || null },
  });
  if (contact) {
    await prisma.contactActivity.create({ data: { contactId: contact.id, type: "note", body: `📥 SMS received: ${body.slice(0, 200)}`, authorName: "SMS" } });
  }
  await createNotification(ownerId, "sms", "New text message", `${contact?.name || from}: ${body.slice(0, 80)}`, contact ? `/crm/contacts/${contact.id}` : "/crm/contacts");

  return twiml;
}
