import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";
import { getIntegrationForUser } from "@/lib/agency-integrations";
import { sendSms } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// List the SMS thread with a contact.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contact = await prisma.contact.findFirst({ where: { id: params.id, userId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await prisma.smsMessage.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ messages, phone: contact.phone });
}

// Send a text to the contact from the agency's Twilio number.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contact = await prisma.contact.findFirst({ where: { id: params.id, userId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!contact.phone) return NextResponse.json({ error: "This contact has no phone number." }, { status: 400 });

  const { body } = await req.json().catch(() => ({}));
  if (!body?.trim()) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const integ = await getIntegrationForUser(userId);
  if (!integ?.twilioAccountSid || !integ?.twilioAuthToken || !integ?.twilioFromNumber) {
    return NextResponse.json({ error: "Texting isn't enabled yet. Ask your provider to connect Twilio." }, { status: 400 });
  }

  try {
    const sent = await sendSms(
      { accountSid: integ.twilioAccountSid, authToken: integ.twilioAuthToken, fromNumber: integ.twilioFromNumber },
      contact.phone, String(body)
    );
    const msg = await prisma.smsMessage.create({
      data: { userId, contactId: contact.id, direction: "outbound", fromNumber: integ.twilioFromNumber, toNumber: contact.phone, body: String(body).slice(0, 1600), status: sent.status, twilioSid: sent.sid },
    });
    await prisma.contactActivity.create({ data: { contactId: contact.id, type: "note", body: `📤 SMS sent: ${String(body).slice(0, 200)}`, authorName: "SMS" } });
    return NextResponse.json({ message: msg });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to send." }, { status: 502 });
  }
}
