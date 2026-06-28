import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Diagnostic: shows which Google integrations are connected for the effective
// user (the impersonated client when an admin/super-admin is viewing one).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;

  const viewing = cookies().get("adminViewingAs")?.value || null;
  const impersonating = !!(viewing && (u.role === "ADMIN" || u.role === "SUPER_ADMIN"));
  const targetUserId = impersonating ? viewing! : u.id;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true, name: true, email: true,
      gscAccessToken: true, gscRefreshToken: true, gscProperty: true,
      gaAccessToken: true, gaRefreshToken: true, gaPropertyId: true,
      gmbAccessToken: true, gmbRefreshToken: true, gmbAccountId: true, gmbLocationId: true,
    },
  });

  return NextResponse.json({
    you: { id: u.id, role: u.role, email: u.email },
    impersonating,
    targetUser: target ? { id: target.id, name: target.name, email: target.email } : null,
    connections: {
      gsc: { connected: !!(target?.gscAccessToken && target?.gscRefreshToken), propertySet: !!target?.gscProperty },
      ga: { connected: !!(target?.gaAccessToken && target?.gaRefreshToken), propertySet: !!target?.gaPropertyId },
      gmb: { connected: !!(target?.gmbAccessToken && target?.gmbRefreshToken), accountSet: !!target?.gmbAccountId, locationSet: !!target?.gmbLocationId },
    },
  });
}
