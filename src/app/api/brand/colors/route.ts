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
  const colors = await prisma.brandColor.findMany({
    where: { userId: { in: companyUserIds } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ colors });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, hex } = body;

  if (!name || !hex) {
    return NextResponse.json({ error: "Name and hex are required" }, { status: 400 });
  }

  const color = await prisma.brandColor.create({
    data: { userId, name, hex },
  });

  return NextResponse.json({ color }, { status: 201 });
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
  const color = await prisma.brandColor.findUnique({ where: { id } });

  if (!color || !companyUserIds.includes(color.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.brandColor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
