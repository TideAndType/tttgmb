import { prisma } from "@/lib/prisma";

// Root domain that agency subdomains hang off, e.g. "clients.tideandtype.com".
// Set AGENCY_ROOT_DOMAIN in the environment; falls back to the NEXTAUTH_URL host.
export function rootDomain(): string {
  if (process.env.AGENCY_ROOT_DOMAIN) return process.env.AGENCY_ROOT_DOMAIN;
  try { return new URL(process.env.NEXTAUTH_URL || "").host; } catch { return ""; }
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "agency";
}

function stripHost(host: string): string {
  return host.split(":")[0].toLowerCase().replace(/^www\./, "");
}

// Resolve a request Host header to an agency: exact custom-domain match first,
// then a "{slug}.<rootDomain>" subdomain match.
export async function agencyForHost(rawHost: string | null | undefined) {
  if (!rawHost) return null;
  const host = stripHost(rawHost);

  const byDomain = await prisma.agency.findFirst({ where: { customDomain: host } });
  if (byDomain) return byDomain;

  const root = stripHost(rootDomain());
  if (root && host.endsWith("." + root)) {
    const slug = host.slice(0, host.length - root.length - 1);
    if (slug && slug !== "www") {
      return prisma.agency.findUnique({ where: { slug } });
    }
  }
  return null;
}

// Public branding subset used by the login page and client chrome.
export function publicBranding(a: {
  appName: string; logoData: string | null; primaryColor: string;
  accentColor: string; loginHeadline: string | null; loginSubtext: string | null; name: string;
}) {
  return {
    appName: a.appName,
    logoUrl: a.logoData,
    primaryColor: a.primaryColor,
    accentColor: a.accentColor,
    loginHeadline: a.loginHeadline,
    loginSubtext: a.loginSubtext,
    agencyName: a.name,
  };
}
