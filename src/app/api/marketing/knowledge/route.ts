import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

const MAX_CHARS = 40000;

export async function GET() {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docs = await prisma.marketingKnowledgeDoc.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    docs: docs.map((d) => ({ id: d.id, name: d.name, createdAt: d.createdAt, chars: d.content.length, preview: d.content.slice(0, 240) })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, content } = await req.json().catch(() => ({}));
  if (!name?.trim() || !content?.trim()) return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
  const trimmed = String(content).slice(0, MAX_CHARS);
  const doc = await prisma.marketingKnowledgeDoc.create({
    data: { userId, name: String(name).slice(0, 160), content: trimmed },
  });
  return NextResponse.json({ doc: { id: doc.id, name: doc.name, createdAt: doc.createdAt, chars: doc.content.length, preview: doc.content.slice(0, 240) }, truncated: content.length > MAX_CHARS });
}
