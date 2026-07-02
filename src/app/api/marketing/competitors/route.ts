import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const competitors = await prisma.marketingCompetitor.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { insights: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ competitors });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, website, notes } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const competitor = await prisma.marketingCompetitor.create({
    data: { userId, name: String(name).slice(0, 160), website: website || null, notes: notes || null },
    include: { insights: true },
  });
  return NextResponse.json({ competitor });
}
