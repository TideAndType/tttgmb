import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export interface Scores {
  overall: number;
  seo: number;
  local: number;
  social: number;
  reputation: number;
  website: number;
  aiVisibility: number;
  leadGen: number;
  breakdown: Record<string, unknown>;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Deterministic, explainable marketing health scores derived from real signals
// already in the platform. Kept AI-free so it's cheap to run daily; the AI
// briefing layers narrative on top of these numbers. Each sub-score degrades
// gracefully when a data source isn't connected.
export async function computeScores(userId: string): Promise<Scores> {
  const companyUserIds = await getCompanyUserIds(userId);
  const owner = { in: companyUserIds };

  const [user, profile, keywords, snapshots, openTasks, doneTasks, publishedContent, ratings, deliverables] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { gscProperty: true, gaPropertyId: true, gmbLocationId: true, openLensApiKey: true } }),
      prisma.marketingProfile.findUnique({ where: { userId } }),
      prisma.trackedKeyword.count({ where: { userId: owner } }),
      prisma.keywordSnapshot.findMany({ where: { keyword: { is: { userId: owner } } }, orderBy: { date: "desc" }, take: 100, select: { position: true } }),
      prisma.marketingTask.count({ where: { userId, status: "open" } }),
      prisma.marketingTask.count({ where: { userId, status: "done" } }),
      prisma.marketingContent.count({ where: { userId, status: { in: ["published", "scheduled"] } } }),
      prisma.satisfactionRating.findMany({ where: { userId: owner }, select: { score: true } }).catch(() => [] as { score: number }[]),
      prisma.deliverable.count({ where: { userId: owner } }),
    ]);

  // Profile completeness (0..1) — how much the AI knows about the business.
  const pf = profile
    ? [profile.website, profile.services, profile.locations, profile.targetAudience, profile.brandVoice, profile.competitors, profile.goals].filter(Boolean).length / 7
    : 0;

  // SEO: GSC connection + keyword tracking + average rank quality.
  const avgPos = snapshots.length ? snapshots.reduce((a, s) => a + s.position, 0) / snapshots.length : 0;
  const rankQuality = avgPos > 0 ? clamp(100 - (avgPos - 1) * 5) : 0; // #1≈100, #20≈5
  const seo = clamp(
    (user?.gscProperty ? 35 : 0) +
    (keywords > 0 ? Math.min(25, keywords * 2) : 0) +
    rankQuality * 0.4
  );

  // Local visibility: GBP connection + profile locations.
  const local = clamp((user?.gmbLocationId ? 55 : 0) + (profile?.locations ? 30 : 0) + pf * 15);

  // Social: profile social accounts + recent published social content.
  const social = clamp((profile?.socialAccounts ? 40 : 0) + Math.min(45, publishedContent * 9) + pf * 15);

  // Reputation: satisfaction ratings average (fallback neutral when none).
  const avgRating = ratings.length ? ratings.reduce((a, r) => a + r.score, 0) / ratings.length : 0;
  const reputation = ratings.length ? clamp((avgRating / 5) * 100) : 50;

  // Website: GA connection + having a website on file + deliverable activity.
  const website = clamp((user?.gaPropertyId ? 45 : 0) + (profile?.website ? 25 : 0) + Math.min(30, deliverables * 3));

  // AI visibility: OpenLens key connected + brand context available.
  const aiVisibility = clamp((user?.openLensApiKey ? 60 : 0) + pf * 40);

  // Lead gen: forms/deliverables activity + profile goals + completed work.
  const leadGen = clamp(Math.min(50, deliverables * 4) + (profile?.goals ? 25 : 0) + Math.min(25, doneTasks * 3));

  const overall = clamp((seo + local + social + reputation + website + aiVisibility + leadGen) / 7);

  return {
    overall, seo, local, social, reputation, website, aiVisibility, leadGen,
    breakdown: {
      profileCompleteness: Math.round(pf * 100),
      trackedKeywords: keywords,
      avgPosition: Number(avgPos.toFixed(1)),
      openTasks, doneTasks, publishedContent,
      avgRating: Number(avgRating.toFixed(1)),
      connections: {
        gsc: !!user?.gscProperty, ga: !!user?.gaPropertyId, gmb: !!user?.gmbLocationId, openLens: !!user?.openLensApiKey,
      },
    },
  };
}
