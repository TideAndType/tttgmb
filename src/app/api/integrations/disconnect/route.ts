import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const FIELDS: Record<string, Record<string, null>> = {
  gsc: { gscAccessToken: null, gscRefreshToken: null, gscProperty: null },
  ga: { gaAccessToken: null, gaRefreshToken: null, gaPropertyId: null },
  gmb: { gmbAccessToken: null, gmbRefreshToken: null, gmbAccountId: null, gmbLocationId: null },
};

// Clears the OAuth tokens for one integration. Targets the impersonated client
// when an admin/super-admin is viewing one; otherwise the signed-in user.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;

  const { service } = await req.json();
  const data = FIELDS[service];
  if (!data) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

  const viewing = cookies().get("adminViewingAs")?.value;
  const targetUserId = (viewing && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? viewing : u.id;

  await prisma.user.update({ where: { id: targetUserId }, data });
  return NextResponse.json({ ok: true });
}
