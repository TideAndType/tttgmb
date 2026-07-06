import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";
import { getAgencySender } from "@/lib/agency-email";
import { renderMarkdown } from "@/lib/markdown";
import { audienceWhere } from "@/lib/campaign-audience";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_RECIPIENTS = 500; // per-send cap (single request); larger lists need a queue.

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: params.id } });
  if (!campaign || campaign.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "sent") return NextResponse.json({ error: "Already sent." }, { status: 400 });
  if (!campaign.subject.trim() || !campaign.body.trim()) return NextResponse.json({ error: "Add a subject and body first." }, { status: 400 });

  const sender = await getAgencySender(userId);
  if (!sender) return NextResponse.json({ error: "Email isn't connected. Add SendGrid or SMTP in Integrations (with a From address)." }, { status: 400 });

  const recipients = await prisma.contact.findMany({
    where: audienceWhere(userId, campaign.audienceStatus, campaign.audienceTag),
    select: { email: true }, take: MAX_RECIPIENTS,
  });
  if (recipients.length === 0) return NextResponse.json({ error: "No contacts match this audience." }, { status: 400 });

  const html = renderMarkdown(campaign.body);
  let sent = 0, failed = 0;
  // Small concurrent batches to stay within the function timeout.
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(batch.map(async (r) => {
      try { await sender.send(r.email!, campaign.subject, html); sent++; }
      catch { failed++; }
    }));
  }

  const updated = await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "sent", recipientCount: recipients.length, sentCount: sent, failedCount: failed, sentAt: new Date() },
  });
  return NextResponse.json({ campaign: updated });
}
