import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.emailCampaign.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      name: (b.name?.trim() || "New Campaign").slice(0, 140),
      subject: (b.subject || "").slice(0, 200),
      body: b.body || "",
      audienceStatus: b.audienceStatus || null,
      audienceTag: b.audienceTag || null,
    },
  });
  return NextResponse.json({ campaign });
}
