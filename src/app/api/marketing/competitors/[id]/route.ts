import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const c = await prisma.marketingCompetitor.findUnique({ where: { id: params.id } });
  if (!c || c.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.marketingCompetitor.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
