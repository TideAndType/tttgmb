import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";
import { fetchPageSnapshot } from "@/lib/website-scan";

export const dynamic = "force-dynamic";

interface Rec { category: string; title: string; impact: string; difficulty: string; reason: string; solution: string; }
const CATS = ["seo", "ux", "conversion", "cta", "accessibility", "content", "newpage", "performance"];

// Fetch the client's homepage, extract signals, and have the AI produce
// prioritized growth recommendations (each with impact, difficulty, reason,
// and a concrete solution). Replaces prior open recs for a fresh picture.
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const [profile, user] = await Promise.all([
    prisma.marketingProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { gscProperty: true } }),
  ]);
  const target = (body.url || profile?.website || user?.gscProperty || "").trim();
  if (!target) return NextResponse.json({ error: "No website on file. Add one in your Business Profile or pass a URL." }, { status: 400 });

  let snapshot;
  try {
    snapshot = await fetchPageSnapshot(target);
  } catch (e: any) {
    return NextResponse.json({ error: `Couldn't fetch the site: ${e?.message || "request failed"}. Check the URL.` }, { status: 502 });
  }

  const context = await buildBusinessContext(userId);
  const result = await askClaudeJSON<{ recommendations: Rec[] }>({
    system:
      "You are a website growth and conversion expert reviewing a business's homepage. Using the page snapshot and business context, produce specific, high-value recommendations to grow the business. " +
      "Return STRICT JSON: {\"recommendations\":[{\"category\":\"seo|ux|conversion|cta|accessibility|content|newpage|performance\",\"title\":string,\"impact\":\"high|medium|low\",\"difficulty\":\"easy|medium|hard\",\"reason\":string,\"solution\":string}]}. " +
      "Give 6-10 recommendations across categories. 'reason' = why it matters for THIS business (1-2 sentences). 'solution' = a concrete, actionable fix (specific copy/structure suggestions where useful). Base findings on the actual snapshot signals (missing meta description, heading structure, images missing alt text, no schema, thin content, weak CTAs, etc.).",
    user: `Business context:\n${context}\n\nHomepage snapshot (${snapshot.url}):\n${JSON.stringify({
      title: snapshot.title, metaDescription: snapshot.metaDescription,
      h1: snapshot.h1, h2: snapshot.h2, headingCount: snapshot.headingCount,
      wordCount: snapshot.wordCount, imagesTotal: snapshot.imagesTotal, imagesMissingAlt: snapshot.imagesMissingAlt,
      links: snapshot.links, hasViewport: snapshot.hasViewport, hasSchema: snapshot.hasSchema,
    })}\n\nVisible text excerpt:\n${snapshot.text.slice(0, 2500)}`,
    maxTokens: 2400,
  });

  const recs = (result?.recommendations ?? []).filter((r) => CATS.includes(r.category)).slice(0, 12);
  if (recs.length === 0) return NextResponse.json({ error: "The AI didn't return recommendations. Try again." }, { status: 502 });

  // Replace prior open recs so the list reflects the latest scan.
  await prisma.websiteRecommendation.deleteMany({ where: { userId, status: "open" } });
  await prisma.$transaction(
    recs.map((r) => prisma.websiteRecommendation.create({
      data: {
        userId,
        category: r.category,
        title: String(r.title).slice(0, 200),
        impact: ["high", "medium", "low"].includes(r.impact) ? r.impact : "medium",
        difficulty: ["easy", "medium", "hard"].includes(r.difficulty) ? r.difficulty : "medium",
        reason: String(r.reason || "").slice(0, 2000),
        solution: String(r.solution || "").slice(0, 4000),
        scanUrl: snapshot.url,
      },
    }))
  );

  const created = await prisma.websiteRecommendation.findMany({ where: { userId, status: "open" }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ recommendations: created, scanUrl: snapshot.url });
}
