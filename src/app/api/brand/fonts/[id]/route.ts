import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const font = await prisma.brandFont.findFirst({
    where: { id: params.id, userId },
  });

  if (!font) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.brandFont.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
