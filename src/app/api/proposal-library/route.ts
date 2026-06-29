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
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const items = await prisma.proposalLibraryItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, category, data } = await req.json();
  if (!name?.trim() || data === undefined) return NextResponse.json({ error: "Name and data are required" }, { status: 400 });
  const item = await prisma.proposalLibraryItem.create({
    data: { name: name.trim(), category: category?.trim() || null, data },
  });
  return NextResponse.json({ item }, { status: 201 });
}
