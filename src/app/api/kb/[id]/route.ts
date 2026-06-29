import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const article = await prisma.kbArticle.findUnique({ where: { id: params.id } });
  if (!article || (!article.published && !isAdmin(session.user as any))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, category, body, published } = await req.json();
  const data: any = {};
  if (title !== undefined) data.title = String(title).trim();
  if (category !== undefined) data.category = category?.trim() || null;
  if (body !== undefined) data.body = String(body).trim();
  if (published !== undefined) data.published = !!published;
  await prisma.kbArticle.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.kbArticle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
