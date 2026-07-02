import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

const FIELDS = ["companyName", "website", "industry", "services", "locations", "targetAudience", "brandVoice", "competitors", "socialAccounts", "goals", "faqs", "extraNotes"] as const;

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.marketingProfile.findUnique({ where: { userId } });
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) if (f in body) data[f] = body[f] ? String(body[f]) : null;

  const profile = await prisma.marketingProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return NextResponse.json({ profile });
}
