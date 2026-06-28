import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// PATCH — update a team member's permissions (same company only).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { companyId: true } });
  if (!me?.companyId || !target || target.companyId !== me.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { permissions } = await req.json();
  const cleanPermissions = Array.isArray(permissions)
    ? permissions.filter((p: unknown): p is string => typeof p === "string" && ALL_PERMISSION_KEYS.includes(p))
    : [];

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { permissions: cleanPermissions },
    select: { id: true, name: true, email: true, permissions: true },
  });
  return NextResponse.json(updated);
}
