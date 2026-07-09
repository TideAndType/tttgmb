// Fetch a URL and extract a compact, text-only snapshot for AI analysis.
// Deliberately lightweight (no DOM parser dependency): regex extraction of the
// signals that matter for a marketing/SEO review.

export interface PageSnapshot {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  headingCount: number;
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  links: number;
  hasViewport: boolean;
  hasSchema: boolean;
  hrefs: string[];
  text: string;
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function matchAll(re: RegExp, s: string): string[] {
  const out: string[] = [];
  let m;
  while ((m = re.exec(s)) !== null) out.push(m[1]);
  return out;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchPageSnapshot(rawUrl: string): Promise<PageSnapshot> {
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "HarborHQ-WebsiteAdvisor/1.0" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Site returned ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "").trim();
  const metaDescription = (/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1]
    || /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i.exec(html)?.[1] || "").trim();
  const h1 = matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html).map(stripTags).filter(Boolean);
  const h2 = matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html).map(stripTags).filter(Boolean);
  const headingCount = (html.match(/<h[1-6][^>]*>/gi) || []).length;
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imagesMissingAlt = imgTags.filter((t) => !/\balt\s*=\s*["'][^"']*\S[^"']*["']/i.test(t)).length;
  const links = (html.match(/<a[^>]+href=/gi) || []).length;
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html) || /itemscope/i.test(html);

  // Resolve internal links to absolute URLs (deduped, capped).
  const origin = new URL(url).origin;
  const rawHrefs = matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi, html);
  const hrefSet = new Set<string>();
  for (const h of rawHrefs) {
    if (/^(mailto:|tel:|javascript:|data:)/i.test(h)) continue;
    try {
      const abs = new URL(h, url).toString();
      if (abs.startsWith(origin)) hrefSet.add(abs.split("#")[0]);
    } catch { /* skip */ }
    if (hrefSet.size >= 40) break;
  }

  const text = stripTags(html).slice(0, 4000);

  return {
    url, title, metaDescription,
    h1: h1.slice(0, 10), h2: h2.slice(0, 15),
    headingCount,
    wordCount: text ? text.split(/\s+/).length : 0,
    imagesTotal: imgTags.length,
    imagesMissingAlt,
    links,
    hasViewport, hasSchema,
    hrefs: Array.from(hrefSet),
    text,
  };
}

// Check a sample of links for broken responses (>=400 or network error).
export async function checkLinks(hrefs: string[], limit = 10): Promise<{ url: string; status: number | null }[]> {
  const sample = hrefs.slice(0, limit);
  return Promise.all(sample.map(async (u) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(u, { method: "GET", signal: controller.signal, headers: { "User-Agent": "HarborHQ-SEO/1.0" }, redirect: "follow" });
      return { url: u, status: res.status };
    } catch {
      return { url: u, status: null };
    } finally {
      clearTimeout(timer);
    }
  }));
}
