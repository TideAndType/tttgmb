import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";
import { computeScores } from "@/lib/marketing-scores";

export const dynamic = "force-dynamic";

interface Narrative { summary: string; improved: string[]; declined: string[]; whyItMatters: string; impact: string; nextSteps: string[]; priorities: string[]; }

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await prisma.marketingReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ reports });
}

// Generate a fresh narrative report from current vs. previous marketing health
// plus the underlying signals. Plain-English, no jargon.
export async function POST() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const [context, scores, previous] = await Promise.all([
    buildBusinessContext(userId),
    computeScores(userId),
    prisma.marketingScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const current = { overall: scores.overall, seo: scores.seo, local: scores.local, social: scores.social, reputation: scores.reputation, website: scores.website, aiVisibility: scores.aiVisibility, leadGen: scores.leadGen };
  const prev = previous ? { overall: previous.overall, seo: previous.seo, local: previous.local, social: previous.social, reputation: previous.reputation, website: previous.website, aiVisibility: previous.aiVisibility, leadGen: previous.leadGen } : null;

  const narrative = await askClaudeJSON<Narrative>({
    system:
      "You are a marketing account manager writing a monthly report for a small-business owner who isn't technical. Warm, clear, no jargon, no fluff. Explain the story behind the numbers. " +
      "Return STRICT JSON: {\"summary\":string,\"improved\":string[],\"declined\":string[],\"whyItMatters\":string,\"impact\":string,\"nextSteps\":string[],\"priorities\":string[]}. " +
      "'summary' = 2-4 sentences on how marketing is going. 'improved'/'declined' = specific changes vs. the previous period (compare the score sets and signals). 'whyItMatters' = 2-3 sentences connecting it to their business. 'impact' = the likely effect on leads/revenue in plain terms. 'nextSteps' = 3-5 concrete actions. 'priorities' = the 3 most important things for next period.",
    user: `Business context:\n${context}\n\nCurrent marketing health scores (0-100): ${JSON.stringify(current)}\nPrevious scores: ${prev ? JSON.stringify(prev) : "none (first report)"}\nUnderlying signals: ${JSON.stringify(scores.breakdown)}`,
    maxTokens: 1800,
  });

  if (!narrative?.summary) return NextResponse.json({ error: "The AI didn't return a report. Try again." }, { status: 502 });

  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  const now = new Date();
  const title = `Marketing Report — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  const report = await prisma.marketingReport.create({
    data: {
      userId, title, summary: narrative.summary,
      sections: { improved: arr(narrative.improved), declined: arr(narrative.declined), whyItMatters: narrative.whyItMatters || "", impact: narrative.impact || "", nextSteps: arr(narrative.nextSteps), priorities: arr(narrative.priorities), scores: current },
    },
  });
  return NextResponse.json({ report });
}
