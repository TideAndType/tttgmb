import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
  const userId = isAdmin && viewing ? viewing : u.id;
  const companyName = u.companyName ?? session.user?.name ?? null;

  // Agency branding takes precedence: a client sees their agency's logo/colors.
  // Falls back to the single agency (current single-tenant deployments), then
  // to the user's own brand assets.
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
  let agency = me?.agencyId ? await prisma.agency.findUnique({ where: { id: me.agencyId } }) : null;
  if (!agency) {
    const count = await prisma.agency.count();
    if (count === 1) agency = await prisma.agency.findFirst();
  }
  if (agency) {
    return NextResponse.json({
      logoUrl: agency.logoData ?? null,
      primaryColor: agency.primaryColor ?? null,
      companyName,
    });
  }

  const [logo, firstColor] = await Promise.all([
    prisma.brandAsset.findFirst({ where: { userId, type: "LOGO" }, orderBy: { createdAt: "asc" } }),
    prisma.brandColor.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    logoUrl: logo ? `/api/uploads/${logo.filename}` : null,
    primaryColor: firstColor?.hex ?? null,
    companyName,
  });
}
