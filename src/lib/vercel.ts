// Thin Vercel Domains API client. Lets agencies self-provision a custom domain:
// when an admin saves one, we attach it to the Vercel project so TLS is issued
// and the host routes to the app. All calls are best-effort and no-op when the
// integration isn't configured.

const API = "https://api.vercel.com";

export function vercelConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function auth() {
  return { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json" };
}
function teamQuery(): string {
  return process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
}
const project = () => process.env.VERCEL_PROJECT_ID;

// Add a domain to the project (idempotent-ish: "already exists" is treated as OK).
export async function addVercelDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelConfigured()) return { ok: false, error: "not_configured" };
  const res = await fetch(`${API}/v10/projects/${project()}/domains${teamQuery()}`, {
    method: "POST", headers: auth(), body: JSON.stringify({ name: domain }),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  const code = data?.error?.code;
  if (code === "domain_already_in_use" || code === "domain_already_exists") return { ok: true };
  return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
}

export async function removeVercelDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!vercelConfigured()) return { ok: false, error: "not_configured" };
  const res = await fetch(`${API}/v9/projects/${project()}/domains/${encodeURIComponent(domain)}${teamQuery()}`, {
    method: "DELETE", headers: auth(),
  });
  if (res.ok || res.status === 404) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
}

export interface DomainStatus {
  configured: boolean;   // integration available
  verified: boolean;
  misconfigured: boolean;
  // DNS records the customer must set (from Vercel's domain config).
  records: { type: string; name: string; value: string }[];
  error?: string;
}

// Fetch verification + DNS configuration for a domain so the UI can guide the
// customer through the CNAME setup and show a verified badge.
export async function getVercelDomainStatus(domain: string): Promise<DomainStatus> {
  if (!vercelConfigured()) return { configured: false, verified: false, misconfigured: false, records: [] };
  try {
    const [dRes, cRes] = await Promise.all([
      fetch(`${API}/v9/projects/${project()}/domains/${encodeURIComponent(domain)}${teamQuery()}`, { headers: auth() }),
      fetch(`${API}/v6/domains/${encodeURIComponent(domain)}/config${teamQuery()}`, { headers: auth() }),
    ]);
    const d = await dRes.json().catch(() => ({}));
    const c = await cRes.json().catch(() => ({}));
    const verified = d?.verified === true;
    const misconfigured = c?.misconfigured === true;
    const records: { type: string; name: string; value: string }[] = [];
    // Verification challenges (TXT/CNAME) when not yet verified.
    if (Array.isArray(d?.verification)) {
      for (const v of d.verification) records.push({ type: v.type, name: v.domain || domain, value: v.value });
    }
    return { configured: true, verified, misconfigured, records };
  } catch (e: any) {
    return { configured: true, verified: false, misconfigured: true, records: [], error: e?.message };
  }
}
