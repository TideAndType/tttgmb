import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

interface PlanItem { type: string; title: string; dayOffset: number; brief: string; }
const VALID = ["blog", "facebook", "instagram", "linkedin", "gbp", "email", "video"];

// Generate a rolling content plan: the AI proposes a mix of posts across the
// next N weeks; each becomes a scheduled draft the user can open in Content
// Studio to expand into full copy.
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const { weeks = 4 } = await req.json().catch(() => ({}));
  const span = Math.max(1, Math.min(8, Number(weeks) || 4));
  const context = await buildBusinessContext(userId);

  const result = await askClaudeJSON<{ items: PlanItem[] }>({
    system:
      "You are a content strategist building a marketing content calendar. Propose a balanced mix of content across the requested weeks — blogs, social posts (facebook/instagram/linkedin), Google Business posts, emails, and video/reel ideas — spaced sensibly (not all on one day). " +
      "Return STRICT JSON: {\"items\":[{\"type\":\"blog|facebook|instagram|linkedin|gbp|email|video\",\"title\":string,\"dayOffset\":number,\"brief\":string}]}. " +
      "'dayOffset' = days from today (0..N). 'brief' = one sentence on the angle. Tailor everything to THIS business. Aim for ~3-4 items per week.",
    user: `Business context:\n${context}\n\nPlan ${span} weeks of content (dayOffset 0 to ${span * 7}).`,
    maxTokens: 2000,
  });

  const items = (result?.items ?? []).filter((i) => VALID.includes(i.type)).slice(0, span * 5);
  if (items.length === 0) return NextResponse.json({ error: "The AI didn't return a plan. Try again." }, { status: 502 });

  const base = Date.now();
  const created = await prisma.$transaction(
    items.map((i) => {
      const d = new Date(base + Math.max(0, Math.min(span * 7, Number(i.dayOffset) || 0)) * 86400000);
      return prisma.marketingContent.create({
        data: {
          userId,
          type: i.type,
          title: String(i.title).slice(0, 160),
          body: i.brief ? `_${i.brief}_\n\n(Open in Content Studio to generate the full piece.)` : "(Draft — open in Content Studio to generate.)",
          status: "scheduled",
          scheduledAt: d,
        },
      });
    })
  );
  return NextResponse.json({ created: created.length });
}
