import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recs = await prisma.websiteRecommendation.findMany({
    where: { userId, status: { not: "dismissed" } },
    orderBy: { createdAt: "desc" },
  });
  const last = recs[0];
  return NextResponse.json({ recommendations: recs, lastScan: last ? { at: last.createdAt, url: last.scanUrl } : null });
}
