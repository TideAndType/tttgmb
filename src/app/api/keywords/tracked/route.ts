import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function effectiveUserId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id;
}

// List tracked keywords with their snapshot history.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const tracked = await prisma.trackedKeyword.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { snapshots: { orderBy: { date: "asc" } } },
  });

  const keywords = tracked.map((k) => {
    const snaps = k.snapshots;
    const latest = snaps[snaps.length - 1] || null;
    const previous = snaps.length > 1 ? snaps[snaps.length - 2] : null;
    return {
      id: k.id,
      query: k.query,
      tags: k.tags,
      folderId: k.folderId,
      latest: latest
        ? { date: latest.date, position: latest.position, clicks: latest.clicks, impressions: latest.impressions, ctr: latest.ctr }
        : null,
      change: latest && previous ? Number((previous.position - latest.position).toFixed(1)) : null,
      history: snaps.map((s) => ({ date: s.date, position: s.position })),
    };
  });

  return NextResponse.json({ keywords });
}

// Add one or more keywords to track.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const body = await req.json();
  const queries: string[] = Array.isArray(body.queries)
    ? body.queries
    : body.query
    ? [body.query]
    : [];
  const tags: string[] = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];
  const folderId: string | null = body.folderId ? String(body.folderId) : null;

  const cleaned = queries.map((q) => String(q).trim()).filter(Boolean);
  if (cleaned.length === 0) return NextResponse.json({ error: "No keywords provided" }, { status: 400 });

  await Promise.all(
    cleaned.map((query) =>
      prisma.trackedKeyword.upsert({
        where: { userId_query: { userId, query } },
        create: { userId, query, tags, folderId },
        update: { ...(tags.length ? { tags } : {}), ...(body.folderId !== undefined ? { folderId } : {}) },
      })
    )
  );

  return NextResponse.json({ ok: true, added: cleaned.length });
}
