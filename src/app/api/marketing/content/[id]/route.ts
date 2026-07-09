import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.marketingContent.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.body === "string") data.body = body.body;
  if (typeof body.title === "string") data.title = body.title.slice(0, 160);
  if (body.status && ["draft", "approved", "scheduled", "published"].includes(body.status)) data.status = body.status;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const content = await prisma.marketingContent.update({ where: { id: params.id }, data });

  // Fire automations when content transitions to published.
  if (data.status === "published" && existing.status !== "published") {
    await runAutomations(userId, "content_published", { contentId: content.id, title: content.title, type: content.type });
  }
  return NextResponse.json({ content });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.marketingContent.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.marketingContent.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
