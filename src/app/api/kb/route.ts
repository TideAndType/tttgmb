import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = isAdmin(session.user as any);
  const articles = await prisma.kbArticle.findMany({
    where: admin ? {} : { published: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, category, body, published } = await req.json();
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  const article = await prisma.kbArticle.create({
    data: { title: title.trim(), category: category?.trim() || null, body: body.trim(), published: published !== false },
  });
  return NextResponse.json({ article }, { status: 201 });
}
