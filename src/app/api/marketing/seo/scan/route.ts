import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaudeJSON, aiConfigured } from "@/lib/marketing-ai";
import { fetchPageSnapshot, checkLinks } from "@/lib/website-scan";

export const dynamic = "force-dynamic";

interface Check { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string; fix?: string; }
interface LocalItem { title: string; status: "good" | "todo"; suggestion: string; }

// On-demand technical SEO + Local SEO scan. Deterministic checks on the
// homepage + a broken-link sample, then AI-written fixes for the failures and
// a tailored Local SEO checklist. Live result (not persisted).
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [profile, user] = await Promise.all([
    prisma.marketingProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { gscProperty: true, gmbLocationId: true } }),
  ]);
  const target = (body.url || profile?.website || user?.gscProperty || "").trim();
  if (!target) return NextResponse.json({ error: "No website on file. Add one in your Business Profile." }, { status: 400 });

  let snap;
  try { snap = await fetchPageSnapshot(target); }
  catch (e: any) { return NextResponse.json({ error: `Couldn't fetch the site: ${e?.message || "request failed"}.` }, { status: 502 }); }

  const linkResults = await checkLinks(snap.hrefs, 10);
  const broken = linkResults.filter((l) => l.status === null || l.status >= 400);

  // Deterministic technical checks.
  const checks: Check[] = [
    { id: "title", label: "Page title", status: snap.title ? (snap.title.length > 60 ? "warn" : "pass") : "fail", detail: snap.title ? `“${snap.title}” (${snap.title.length} chars)` : "No <title> found." },
    { id: "meta", label: "Meta description", status: snap.metaDescription ? (snap.metaDescription.length > 160 ? "warn" : "pass") : "fail", detail: snap.metaDescription ? `${snap.metaDescription.length} chars` : "Missing meta description." },
    { id: "h1", label: "H1 heading", status: snap.h1.length === 1 ? "pass" : snap.h1.length === 0 ? "fail" : "warn", detail: snap.h1.length === 0 ? "No H1 found." : `${snap.h1.length} H1 tags.` },
    { id: "headings", label: "Heading structure", status: snap.headingCount >= 3 ? "pass" : "warn", detail: `${snap.headingCount} headings total.` },
    { id: "alt", label: "Image alt text", status: snap.imagesMissingAlt === 0 ? "pass" : snap.imagesMissingAlt > 3 ? "fail" : "warn", detail: `${snap.imagesMissingAlt} of ${snap.imagesTotal} images missing alt text.` },
    { id: "schema", label: "Structured data (schema)", status: snap.hasSchema ? "pass" : "fail", detail: snap.hasSchema ? "Schema markup detected." : "No schema/structured data found." },
    { id: "content", label: "Content depth", status: snap.wordCount >= 300 ? "pass" : "warn", detail: `~${snap.wordCount} words on the homepage.` },
    { id: "viewport", label: "Mobile viewport", status: snap.hasViewport ? "pass" : "fail", detail: snap.hasViewport ? "Viewport meta present." : "No mobile viewport meta tag." },
    { id: "links", label: "Broken links", status: broken.length === 0 ? "pass" : "fail", detail: broken.length === 0 ? `Checked ${linkResults.length} links, all OK.` : `${broken.length} broken of ${linkResults.length} checked.` },
  ];

  const failing = checks.filter((c) => c.status !== "pass");

  // AI: fixes for failing checks + a Local SEO checklist.
  let localItems: LocalItem[] = [];
  if (aiConfigured()) {
    const context = await buildBusinessContext(userId);
    const result = await askClaudeJSON<{ fixes: { id: string; fix: string }[]; local: LocalItem[] }>({
      system:
        "You are a technical + local SEO expert. Given failing homepage checks and the business context, write a concrete fix for each failing check, and a tailored Local SEO checklist. " +
        "Return STRICT JSON: {\"fixes\":[{\"id\":string,\"fix\":string}],\"local\":[{\"title\":string,\"status\":\"good|todo\",\"suggestion\":string}]}. " +
        "'fixes' ids must match the provided check ids; each 'fix' is specific and actionable. 'local' = 6-8 Google Business Profile / local items (categories, hours, photos, posts, reviews, citations, Q&A, map presence) with a short suggestion each.",
      user: `Business context:\n${context}\nGoogle Business Profile connected: ${user?.gmbLocationId ? "yes" : "no"}\nLocations: ${profile?.locations || "unknown"}\n\nFailing checks:\n${JSON.stringify(failing.map((c) => ({ id: c.id, label: c.label, detail: c.detail })))}\nBroken links: ${JSON.stringify(broken.slice(0, 8))}`,
      maxTokens: 1800,
    });
    if (result?.fixes) {
      const byId = new Map(result.fixes.map((f) => [f.id, f.fix]));
      for (const c of checks) if (byId.has(c.id)) c.fix = byId.get(c.id);
    }
    localItems = Array.isArray(result?.local) ? result!.local.slice(0, 8) : [];
  }

  const score = Math.round((checks.filter((c) => c.status === "pass").length / checks.length) * 100);

  return NextResponse.json({
    scanUrl: snap.url,
    score,
    checks,
    local: localItems,
    gbpConnected: !!user?.gmbLocationId,
  });
}
