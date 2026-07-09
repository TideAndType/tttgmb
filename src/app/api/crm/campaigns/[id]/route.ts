import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";
import { audienceWhere } from "@/lib/campaign-audience";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const c = await prisma.emailCampaign.findUnique({ where: { id } });
  return c && c.userId === userId ? c : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = await owned(params.id, userId);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Live recipient count for the current audience.
  const recipientCount = await prisma.contact.count({ where: audienceWhere(userId, campaign.audienceStatus, campaign.audienceTag) });
  return NextResponse.json({ campaign, recipientCount });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await owned(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "sent") return NextResponse.json({ error: "This campaign was already sent." }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 140);
  if (typeof b.subject === "string") data.subject = b.subject.slice(0, 200);
  if (typeof b.body === "string") data.body = b.body;
  if ("audienceStatus" in b) data.audienceStatus = b.audienceStatus || null;
  if ("audienceTag" in b) data.audienceTag = b.audienceTag || null;
  const campaign = await prisma.emailCampaign.update({ where: { id: params.id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.emailCampaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
