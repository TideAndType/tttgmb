import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

// All scheduled/publishable content for the content calendar.
export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.marketingContent.findMany({
    where: { userId, scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, type: true, title: true, status: true, scheduledAt: true },
  });
  return NextResponse.json({ items });
}
