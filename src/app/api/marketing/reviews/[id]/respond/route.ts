import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaude, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

// AI-drafted reply to a review, in the business's brand voice. Returns the
// draft text without saving (the client edits/saves via PATCH).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const review = await prisma.marketingReview.findUnique({ where: { id: params.id } });
  if (!review || review.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const context = await buildBusinessContext(userId);
  const draft = await askClaude({
    system:
      "You write review responses for a small business, in their brand voice. Be genuine, concise (2-4 sentences), and professional. " +
      "For positive reviews: thank them warmly and reinforce a value. For negative reviews: apologize sincerely, take it offline (invite them to contact you), never be defensive. Return only the response text.\n\n" +
      `--- Business context ---\n${context}`,
    user: `Review by ${review.author} (${review.rating}/5 stars):\n"${review.text || "(no text)"}"`,
    maxTokens: 400,
  });
  if (!draft) return NextResponse.json({ error: "The AI didn't return a response. Try again." }, { status: 502 });
  return NextResponse.json({ draft });
}
