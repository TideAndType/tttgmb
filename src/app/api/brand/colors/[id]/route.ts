import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const companyUserIds = await getCompanyUserIds(userId);
  const color = await prisma.brandColor.findUnique({ where: { id: params.id } });

  if (!color || !companyUserIds.includes(color.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.brandColor.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
