import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reviews = await prisma.marketingReview.findMany({ where: { userId }, orderBy: { reviewedAt: "desc" } });

  const total = reviews.length;
  const avg = total ? reviews.reduce((a, r) => a + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  const needsResponse = reviews.filter((r) => !r.response).length;

  return NextResponse.json({ reviews, stats: { total, avg: Number(avg.toFixed(2)), distribution, needsResponse } });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { author, rating, text, source, reviewedAt } = await req.json().catch(() => ({}));
  if (!author?.trim()) return NextResponse.json({ error: "Author required" }, { status: 400 });
  const review = await prisma.marketingReview.create({
    data: {
      userId,
      author: String(author).slice(0, 160),
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      text: text || null,
      source: ["google", "facebook", "yelp", "manual"].includes(source) ? source : "manual",
      reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
    },
  });
  await runAutomations(userId, "review_received", { reviewId: review.id, author: review.author, rating: review.rating, detail: `New ${review.rating}-star review from ${review.author}` });
  return NextResponse.json({ review });
}
