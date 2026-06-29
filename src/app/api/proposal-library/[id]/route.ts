import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user as any)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.proposalLibraryItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
