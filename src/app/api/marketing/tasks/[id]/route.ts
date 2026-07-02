import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.marketingTask.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = body.status as string | undefined;
  const data: Record<string, unknown> = {};
  if (status && ["open", "in_progress", "done", "dismissed"].includes(status)) {
    data.status = status;
    data.completedAt = status === "done" ? new Date() : null;
  }
  const task = await prisma.marketingTask.update({ where: { id: params.id }, data });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.marketingTask.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.marketingTask.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
