import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/agency";
import { maskIntegration, getAgencyIntegration } from "@/lib/agency-integrations";
import { encryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

// Resolve (creating if needed) the caller admin's own agency id.
async function ownAgencyId(userId: string, name: string): Promise<string> {
  let agency = await prisma.agency.findFirst({ where: { ownerId: userId }, select: { id: true } });
  if (!agency) {
    const base = slugify(name);
    let slug = base;
    for (let i = 1; await prisma.agency.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const created = await prisma.agency.create({ data: { name, slug, ownerId: userId, appName: name } });
    await prisma.user.update({ where: { id: userId }, data: { agencyId: created.id } });
    agency = { id: created.id };
  }
  return agency.id;
}

// GET returns masked/status only — never raw secrets.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = session!.user as any;
  const agencyId = await ownAgencyId(u.id, u.companyName || u.name || "My Agency");
  const integration = await getAgencyIntegration(agencyId);
  return NextResponse.json({ integrations: maskIntegration(integration) });
}

// PATCH sets keys. Empty string clears a field; omitted fields are untouched.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = session!.user as any;
  const agencyId = await ownAgencyId(u.id, u.companyName || u.name || "My Agency");
  const b = await req.json().catch(() => ({}));

  const str = (v: unknown) => (v === undefined ? undefined : v ? String(v) : null);
  const SECRETS = new Set(["stripeSecretKey", "twilioAccountSid", "twilioAuthToken", "sendgridApiKey", "smtpPass"]);
  const data: Record<string, unknown> = {};
  for (const f of ["stripeSecretKey", "stripePublishableKey", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber", "sendgridApiKey", "smtpHost", "smtpUser", "smtpPass", "fromEmail", "fromName"]) {
    const v = str(b[f]);
    if (v !== undefined) data[f] = SECRETS.has(f) ? encryptSecret(v) : v;
  }
  if (b.emailProvider && ["none", "sendgrid", "smtp"].includes(b.emailProvider)) data.emailProvider = b.emailProvider;
  if (b.smtpPort !== undefined) data.smtpPort = b.smtpPort ? Number(b.smtpPort) : null;

  const integration = await prisma.agencyIntegration.upsert({
    where: { agencyId },
    create: { agencyId, ...data },
    update: data,
  });
  return NextResponse.json({ integrations: maskIntegration(integration) });
}
