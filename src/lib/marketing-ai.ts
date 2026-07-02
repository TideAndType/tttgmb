import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Resolve the effective client user id (impersonation-aware): an admin viewing
// a client operates on that client's Marketing OS data.
export async function effectiveMarketingUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
  return isAdmin && viewing ? viewing : u.id;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Build a compact business-context system preamble from the client's marketing
// profile (falls back to their user record). Used by every AI feature so the
// assistant behaves like an employee who knows the business.
export async function buildBusinessContext(userId: string): Promise<string> {
  const [profile, user] = await Promise.all([
    prisma.marketingProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { companyName: true, name: true, gscProperty: true } }),
  ]);

  const lines: string[] = [];
  const company = profile?.companyName || user?.companyName || "the business";
  lines.push(`Business: ${company}`);
  if (profile?.website || user?.gscProperty) lines.push(`Website: ${profile?.website || user?.gscProperty}`);
  if (profile?.industry) lines.push(`Industry: ${profile.industry}`);
  if (profile?.services) lines.push(`Services: ${profile.services}`);
  if (profile?.locations) lines.push(`Locations: ${profile.locations}`);
  if (profile?.targetAudience) lines.push(`Target audience: ${profile.targetAudience}`);
  if (profile?.brandVoice) lines.push(`Brand voice: ${profile.brandVoice}`);
  if (profile?.competitors) lines.push(`Competitors: ${profile.competitors}`);
  if (profile?.goals) lines.push(`Goals: ${profile.goals}`);
  if (profile?.faqs) lines.push(`FAQs: ${profile.faqs}`);

  // Include a little knowledge-base context (names + short excerpts).
  const docs = await prisma.marketingKnowledgeDoc.findMany({
    where: { userId }, orderBy: { createdAt: "desc" }, take: 5,
    select: { name: true, content: true },
  });
  if (docs.length) {
    lines.push("Reference documents:");
    for (const d of docs) lines.push(`- ${d.name}: ${d.content.slice(0, 400)}`);
  }
  return lines.join("\n");
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

interface AskOpts {
  system: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
  model?: string;
  maxTokens?: number;
}

// Single entry point for text generation. Returns null when AI isn't configured
// so callers can degrade gracefully.
export async function askClaude({ system, user, history = [], model, maxTokens = 1200 }: AskOpts): Promise<string | null> {
  if (!aiConfigured()) return null;
  const msg = await client().messages.create({
    model: model || "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [...history, { role: "user", content: user }],
  });
  return msg.content[0]?.type === "text" ? msg.content[0].text : "";
}

// Ask Claude for strict JSON and parse it, tolerating markdown fences.
export async function askClaudeJSON<T>(opts: AskOpts): Promise<T | null> {
  const raw = await askClaude(opts);
  if (raw == null) return null;
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();
  const start = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  const from = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  try {
    return JSON.parse(from >= 0 ? cleaned.slice(from) : cleaned) as T;
  } catch {
    try { return JSON.parse(cleaned) as T; } catch { return null; }
  }
}
