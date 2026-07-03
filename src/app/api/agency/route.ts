import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/agency";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

// Resolve (and lazily create) the caller admin's own agency. Isolation: an
// admin only ever reads/writes the agency they own — never another agency's.
async function ownAgency(userId: string, name: string) {
  let agency = await prisma.agency.findFirst({ where: { ownerId: userId } });
  if (!agency) {
    // Ensure a unique slug.
    const base = slugify(name);
    let slug = base;
    for (let i = 1; await prisma.agency.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    agency = await prisma.agency.create({ data: { name, slug, ownerId: userId, appName: name } });
    await prisma.user.update({ where: { id: userId }, data: { agencyId: agency.id } });
  }
  return agency;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = session!.user as any;
  const agency = await ownAgency(u.id, u.companyName || u.name || "My Agency");
  return NextResponse.json({ agency });
}

const TEXT_FIELDS = ["name", "appName", "loginHeadline", "loginSubtext", "primaryColor", "accentColor", "logoData"] as const;

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = session!.user as any;
  const agency = await ownAgency(u.id, u.companyName || u.name || "My Agency");

  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  for (const f of TEXT_FIELDS) if (f in body) data[f] = body[f] ? String(body[f]) : null;

  // Slug + custom domain need uniqueness checks scoped away from this agency.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const slug = slugify(body.slug);
    const clash = await prisma.agency.findFirst({ where: { slug, id: { not: agency.id } } });
    if (clash) return NextResponse.json({ error: "That subdomain is taken." }, { status: 409 });
    data.slug = slug;
  }
  if ("customDomain" in body) {
    const domain = body.customDomain ? String(body.customDomain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null;
    if (domain) {
      const clash = await prisma.agency.findFirst({ where: { customDomain: domain, id: { not: agency.id } } });
      if (clash) return NextResponse.json({ error: "That domain is already in use." }, { status: 409 });
    }
    data.customDomain = domain;
  }

  const updated = await prisma.agency.update({ where: { id: agency.id }, data });
  return NextResponse.json({ agency: updated });
}
