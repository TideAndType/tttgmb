import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";
import { TRIGGERS, ACTIONS } from "@/lib/automations";

export const dynamic = "force-dynamic";

const validTrigger = (t: string) => TRIGGERS.some((x) => x.value === t);
const validAction = (a: string) => ACTIONS.some((x) => x.value === a);

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const automations = await prisma.automation.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, trigger, action, config } = await req.json().catch(() => ({}));
  if (!name?.trim() || !validTrigger(trigger) || !validAction(action)) {
    return NextResponse.json({ error: "Name, trigger and action are required" }, { status: 400 });
  }
  const automation = await prisma.automation.create({
    data: { userId, name: String(name).slice(0, 160), trigger, action, config: config || {} },
  });
  return NextResponse.json({ automation });
}
