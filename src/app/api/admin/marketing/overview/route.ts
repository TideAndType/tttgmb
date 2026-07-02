import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

// Agency-wide Marketing OS overview: every client with their latest health
// score and open work counts, for the admin console.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true, name: true, companyName: true, image: true },
    orderBy: { createdAt: "desc" },
  });
  const ids = clients.map((c) => c.id);
  if (ids.length === 0) return NextResponse.json({ clients: [] });

  const [scores, openTasks, draftContent] = await Promise.all([
    // Latest score per client.
    prisma.marketingScore.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketingTask.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { in: ["open", "in_progress"] } }, _count: true }),
    prisma.marketingContent.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "draft" }, _count: true }),
  ]);

  const latestByUser = new Map<string, (typeof scores)[number]>();
  for (const s of scores) if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  const openByUser = new Map(openTasks.map((t) => [t.userId, t._count]));
  const draftByUser = new Map(draftContent.map((c) => [c.userId, c._count]));

  const rows = clients.map((c) => {
    const s = latestByUser.get(c.id);
    return {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      image: c.image,
      score: s ? { overall: s.overall, seo: s.seo, local: s.local, social: s.social, reputation: s.reputation, website: s.website, aiVisibility: s.aiVisibility, leadGen: s.leadGen, at: s.createdAt } : null,
      openTasks: openByUser.get(c.id) ?? 0,
      draftContent: draftByUser.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({ clients: rows });
}
