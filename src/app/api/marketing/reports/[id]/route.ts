import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await prisma.marketingReport.findUnique({ where: { id: params.id } });
  if (!r || r.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.marketingReport.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
