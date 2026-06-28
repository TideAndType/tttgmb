import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { locationId } = await req.json();
  if (!locationId) return NextResponse.json({ error: "locationId required" }, { status: 400 });
  const userId = (session.user as any).id;
  await prisma.user.update({ where: { id: userId }, data: { gmbLocationId: locationId } });
  return NextResponse.json({ success: true });
}
