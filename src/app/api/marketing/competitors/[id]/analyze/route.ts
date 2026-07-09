import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

interface Analysis { summary: string; strengths: string[]; gaps: string[]; recommendations: string[]; }

// AI competitive assessment: given the competitor + the client's business, it
// summarizes likely strengths, gaps, and what the client should do. Structured
// so a future live crawler can populate the same CompetitorInsight shape.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const competitor = await prisma.marketingCompetitor.findUnique({ where: { id: params.id } });
  if (!competitor || competitor.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const context = await buildBusinessContext(userId);
  const analysis = await askClaudeJSON<Analysis>({
    system:
      "You are a competitive marketing analyst. Given a competitor and the client's business, produce a concise, actionable competitive assessment. " +
      "Return STRICT JSON: {\"summary\":string,\"strengths\":string[],\"gaps\":string[],\"recommendations\":string[]}. " +
      "'summary' = 2-3 sentences on how this competitor likely competes. 'strengths' = what they probably do well. 'gaps' = where the client can win. 'recommendations' = 3-5 specific moves for the client. Be honest that this is an assessment based on general knowledge, and keep it practical.",
    user: `Client business:\n${context}\n\nCompetitor: ${competitor.name}${competitor.website ? ` (${competitor.website})` : ""}${competitor.notes ? `\nNotes: ${competitor.notes}` : ""}`,
    maxTokens: 1400,
  });

  if (!analysis?.summary) return NextResponse.json({ error: "The AI didn't return an analysis. Try again." }, { status: 502 });

  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  const insight = await prisma.competitorInsight.create({
    data: {
      competitorId: competitor.id,
      summary: analysis.summary,
      strengths: arr(analysis.strengths),
      gaps: arr(analysis.gaps),
      recommendations: arr(analysis.recommendations),
    },
  });
  return NextResponse.json({ insight });
}
