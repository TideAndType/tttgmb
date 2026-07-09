import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVercelDomainStatus } from "@/lib/vercel";

export const dynamic = "force-dynamic";

// Verification + DNS status for the caller agency's custom domain, so the UI
// can show the required records and a verified badge.
export async function GET() {
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  if (!u || (u.role !== "ADMIN" && u.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agency = await prisma.agency.findFirst({ where: { ownerId: u.id } });
  if (!agency?.customDomain) return NextResponse.json({ domain: null, status: null });

  const status = await getVercelDomainStatus(agency.customDomain);
  return NextResponse.json({ domain: agency.customDomain, status });
}
