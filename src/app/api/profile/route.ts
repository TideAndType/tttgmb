import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { name, email } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  // Check email uniqueness (excluding current user)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "Email is already in use by another account" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: { id: true, name: true, email: true, companyName: true, role: true },
  });

  return NextResponse.json(updated);
}
