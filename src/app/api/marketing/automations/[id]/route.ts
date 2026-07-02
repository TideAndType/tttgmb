import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";
import { runOneAutomation } from "@/lib/automations";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const a = await prisma.automation.findUnique({ where: { id } });
  return a && a.userId === userId ? a : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const a = await owned(params.id, userId);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Run-now: execute this automation immediately as a test.
  if (body.run) {
    const ok = await runOneAutomation(userId, a.id, { title: (a.config as any)?.taskTitle });
    return NextResponse.json({ ran: ok ? 1 : 0 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.name === "string") data.name = body.name.slice(0, 160);
  if (body.config) data.config = body.config;
  const automation = await prisma.automation.update({ where: { id: params.id }, data });
  return NextResponse.json({ automation });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const a = await owned(params.id, userId);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.automation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
