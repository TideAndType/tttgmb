import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const companyUserIds = await getCompanyUserIds(userId);
  const fonts = await prisma.brandFont.findMany({
    where: { userId: { in: companyUserIds } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ fonts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, usage } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const validUsages = ["HEADING", "BODY", "ACCENT", "OTHER"];
  const fontUsage = validUsages.includes(usage) ? usage : "OTHER";

  const font = await prisma.brandFont.create({
    data: { userId, name, usage: fontUsage },
  });

  return NextResponse.json({ font }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const companyUserIds = await getCompanyUserIds(userId);
  const font = await prisma.brandFont.findUnique({ where: { id } });

  if (!font || !companyUserIds.includes(font.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.brandFont.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
