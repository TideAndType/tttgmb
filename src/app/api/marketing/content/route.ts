import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaude, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

const TYPE_PROMPTS: Record<string, string> = {
  blog: "Write a complete, SEO-friendly blog post (title + body with headings).",
  facebook: "Write an engaging Facebook post (2-4 short paragraphs) with a call to action.",
  instagram: "Write an Instagram caption with relevant hashtags and an engaging hook.",
  linkedin: "Write a professional LinkedIn post that builds authority.",
  gbp: "Write a Google Business Profile post (concise, local, with a call to action).",
  email: "Write a marketing email newsletter (subject line + body).",
  landing: "Write landing page copy (headline, subheadline, benefits, CTA).",
  service: "Write an SEO-optimized service page (headline, intro, benefits, FAQ, CTA).",
  faq: "Write a set of 6-8 helpful FAQs with concise answers.",
  video: "Write a short video/Reel script with a hook, body, and CTA.",
};

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const content = await prisma.marketingContent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ content });
}

// POST { type, topic } → generate content in the client's brand voice and save
// it as a draft.
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const { type, topic } = await req.json().catch(() => ({}));
  if (!type || !TYPE_PROMPTS[type]) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  if (!topic?.trim()) return NextResponse.json({ error: "Topic required" }, { status: 400 });

  const context = await buildBusinessContext(userId);
  const body = await askClaude({
    system:
      `You are a senior marketing copywriter creating content for this business. ${TYPE_PROMPTS[type]} ` +
      "Match the business's brand voice and audience. Return only the content in clean Markdown — no preamble or meta-commentary.\n\n" +
      `--- Business context ---\n${context}`,
    user: `Topic / brief: ${topic}`,
    maxTokens: 2000,
  });

  if (!body) return NextResponse.json({ error: "The AI didn't return content. Try again." }, { status: 502 });

  const saved = await prisma.marketingContent.create({
    data: { userId, type, title: String(topic).slice(0, 160), body, status: "draft" },
  });
  return NextResponse.json({ content: saved });
}
