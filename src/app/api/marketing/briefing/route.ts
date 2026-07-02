import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";
import { computeScores } from "@/lib/marketing-scores";

export const dynamic = "force-dynamic";

function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// GET returns today's briefing if one exists.
export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const briefing = await prisma.marketingBriefing.findUnique({ where: { userId_date: { userId, date: today() } } });
  return NextResponse.json({ briefing });
}

interface Brief { summary: string; focus: string[]; opportunities: string[]; risks: string[]; wins: string[]; }

// POST generates (or regenerates) today's briefing with the AI.
export async function POST() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const [context, scores, prev] = await Promise.all([
    buildBusinessContext(userId),
    computeScores(userId),
    prisma.marketingScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const brief = await askClaudeJSON<Brief>({
    system:
      "You are an AI marketing employee delivering a concise morning briefing to a small-business owner. Be encouraging, plain-English, and specific to THIS business — no jargon, no fluff. " +
      "Return STRICT JSON: {\"summary\":string,\"focus\":string[],\"opportunities\":string[],\"risks\":string[],\"wins\":string[]}. " +
      "'summary' is 2-3 sentences. 'focus' = the 3 highest-impact things to do today. 'opportunities' = 3-5 growth ideas (content, SEO, local, reviews, seasonal). 'risks' = 2-4 issues to watch. 'wins' = 1-3 recent positives (infer from scores/signals).",
    user: `Business context:\n${context}\n\nToday's marketing health scores (0-100): ${JSON.stringify({ overall: scores.overall, seo: scores.seo, local: scores.local, social: scores.social, reputation: scores.reputation, website: scores.website, aiVisibility: scores.aiVisibility, leadGen: scores.leadGen })}\nSignals: ${JSON.stringify(scores.breakdown)}\nPrevious overall score: ${prev?.overall ?? "n/a"}`,
    maxTokens: 1400,
  });

  if (!brief?.summary) return NextResponse.json({ error: "The AI didn't return a briefing. Try again." }, { status: 502 });

  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  const briefing = await prisma.marketingBriefing.upsert({
    where: { userId_date: { userId, date: today() } },
    create: { userId, date: today(), summary: brief.summary, focus: arr(brief.focus), opportunities: arr(brief.opportunities), risks: arr(brief.risks), wins: arr(brief.wins) },
    update: { summary: brief.summary, focus: arr(brief.focus), opportunities: arr(brief.opportunities), risks: arr(brief.risks), wins: arr(brief.wins) },
  });
  return NextResponse.json({ briefing });
}
