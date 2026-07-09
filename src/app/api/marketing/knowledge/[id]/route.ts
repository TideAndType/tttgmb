import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

// Full content of a single doc (for viewing/editing).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await prisma.marketingKnowledgeDoc.findUnique({ where: { id: params.id } });
  if (!doc || doc.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await prisma.marketingKnowledgeDoc.findUnique({ where: { id: params.id } });
  if (!doc || doc.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.marketingKnowledgeDoc.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
