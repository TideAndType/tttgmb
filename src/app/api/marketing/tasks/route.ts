import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";
import { computeScores } from "@/lib/marketing-scores";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await prisma.marketingTask.findMany({
    where: { userId, status: { not: "dismissed" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

interface GenTask { title: string; category: string; priority: string; impact: string; estMinutes: number; instructions: string; }

// POST { generate: true } → have the AI propose new tasks from the current
// health signals. Otherwise create a manual task from the body.
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.generate) {
    if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });
    const [context, scores, existing] = await Promise.all([
      buildBusinessContext(userId),
      computeScores(userId),
      prisma.marketingTask.findMany({ where: { userId, status: { in: ["open", "in_progress"] } }, select: { title: true } }),
    ]);
    const result = await askClaudeJSON<{ tasks: GenTask[] }>({
      system:
        "You are an AI marketing strategist acting like an in-house marketing employee. Based on the business context and its marketing health scores, propose the highest-impact, concrete marketing tasks to grow the business. " +
        "Return STRICT JSON: {\"tasks\":[{\"title\":string,\"category\":\"seo|local|social|content|reputation|website|leadgen\",\"priority\":\"high|medium|low\",\"impact\":\"high|medium|low\",\"estMinutes\":number,\"instructions\":string}]}. " +
        "Give 5-8 tasks. 'instructions' must be specific, step-by-step, and tailored to THIS business. Prioritize the weakest scores. Do not repeat tasks the business already has.",
      user: `Business context:\n${context}\n\nHealth scores (0-100): ${JSON.stringify({ overall: scores.overall, seo: scores.seo, local: scores.local, social: scores.social, reputation: scores.reputation, website: scores.website, aiVisibility: scores.aiVisibility, leadGen: scores.leadGen })}\nSignals: ${JSON.stringify(scores.breakdown)}\n\nExisting open tasks (avoid duplicates): ${existing.map((t) => t.title).join("; ") || "none"}`,
      maxTokens: 1800,
    });
    const proposed = (result?.tasks ?? []).slice(0, 8);
    if (proposed.length === 0) return NextResponse.json({ error: "The AI didn't return any tasks. Try again." }, { status: 502 });

    const created = await prisma.$transaction(
      proposed.map((t) =>
        prisma.marketingTask.create({
          data: {
            userId,
            title: String(t.title).slice(0, 200),
            category: ["seo", "local", "social", "content", "reputation", "website", "leadgen"].includes(t.category) ? t.category : "general",
            priority: ["high", "medium", "low"].includes(t.priority) ? t.priority : "medium",
            impact: ["high", "medium", "low"].includes(t.impact) ? t.impact : "medium",
            estMinutes: Math.max(5, Math.min(480, Number(t.estMinutes) || 30)),
            instructions: t.instructions ? String(t.instructions).slice(0, 4000) : null,
            source: "ai",
          },
        })
      )
    );
    return NextResponse.json({ created: created.length, tasks: created });
  }

  // Manual task.
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const task = await prisma.marketingTask.create({
    data: {
      userId,
      title: String(body.title).slice(0, 200),
      category: body.category || "general",
      priority: body.priority || "medium",
      impact: body.impact || "medium",
      estMinutes: Number(body.estMinutes) || 30,
      instructions: body.instructions || null,
      source: "manual",
    },
  });
  return NextResponse.json({ task });
}
