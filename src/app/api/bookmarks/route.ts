import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { label, url } = await req.json().catch(() => ({}));
  if (!label?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "Label and URL are required" }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.create({
    data: { userId, label: label.trim(), url: url.trim() },
  });
  return NextResponse.json({ bookmark });
}
