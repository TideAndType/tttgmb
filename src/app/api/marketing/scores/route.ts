import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";
import { computeScores } from "@/lib/marketing-scores";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

// GET returns the latest stored snapshot plus the previous one (for deltas).
export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recent = await prisma.marketingScore.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 2 });
  return NextResponse.json({ latest: recent[0] ?? null, previous: recent[1] ?? null });
}

// POST recomputes scores from live signals and stores a snapshot.
export async function POST() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await computeScores(userId);
  const snapshot = await prisma.marketingScore.create({
    data: {
      userId,
      overall: s.overall, seo: s.seo, local: s.local, social: s.social,
      reputation: s.reputation, website: s.website, aiVisibility: s.aiVisibility, leadGen: s.leadGen,
      breakdown: s.breakdown as object,
    },
  });
  const previous = await prisma.marketingScore.findFirst({
    where: { userId, id: { not: snapshot.id } }, orderBy: { createdAt: "desc" },
  });

  // Fire automations if overall marketing health dropped meaningfully.
  if (previous && snapshot.overall < previous.overall - 4) {
    await runAutomations(userId, "score_drop", { detail: `Marketing health dropped from ${previous.overall} to ${snapshot.overall}` });
  }
  return NextResponse.json({ latest: snapshot, previous });
}
