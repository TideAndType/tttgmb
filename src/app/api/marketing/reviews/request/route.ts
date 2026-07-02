import { NextResponse } from "next/server";
import { effectiveMarketingUserId, buildBusinessContext, askClaude, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

// Generates a short, friendly review-request message the business can send to
// happy customers (email/SMS). Returns text only.
export async function POST() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const context = await buildBusinessContext(userId);
  const message = await askClaude({
    system:
      "Write a warm, concise review-request message a business can send to a happy customer to ask for a Google review. Keep it under 90 words, personable, with a clear ask and a placeholder [REVIEW LINK]. Return only the message.\n\n" +
      `--- Business context ---\n${context}`,
    user: "Write the review-request message.",
    maxTokens: 300,
  });
  if (!message) return NextResponse.json({ error: "The AI didn't return a message. Try again." }, { status: 502 });
  return NextResponse.json({ message });
}
