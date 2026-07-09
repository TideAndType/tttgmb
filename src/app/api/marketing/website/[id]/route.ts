import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rec = await prisma.websiteRecommendation.findUnique({ where: { id: params.id } });
  if (!rec || rec.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { status } = await req.json().catch(() => ({}));
  if (!["open", "done", "dismissed"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const updated = await prisma.websiteRecommendation.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ recommendation: updated });
}
