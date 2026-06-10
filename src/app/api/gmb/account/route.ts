import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await req.json();
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const userId = (session.user as any).id;
  await prisma.user.update({ where: { id: userId }, data: { gmbAccountId: accountId, gmbLocationId: null } });
  return NextResponse.json({ success: true });
}
