import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

function effectiveUserId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id;
}

// Pull current GSC positions and store a dated snapshot for each tracked keyword.
// Idempotent per day (upsert keyed on keywordId + date).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gscAccessToken || !user?.gscRefreshToken) {
    return NextResponse.json({ error: "GSC not connected" }, { status: 400 });
  }
  if (!user.gscProperty) {
    return NextResponse.json({ error: "GSC property not assigned" }, { status: 400 });
  }

  const tracked = await prisma.trackedKeyword.findMany({ where: { userId } });
  if (tracked.length === 0) return NextResponse.json({ ok: true, recorded: 0 });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: user.gscAccessToken, refresh_token: user.gscRefreshToken });

  try {
    const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

    // GSC data lags ~2-3 days; use a recent window and key the snapshot to the window's end.
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const response = await (searchconsole.searchanalytics.query({
      siteUrl: user.gscProperty,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query"],
        rowLimit: 1000,
      },
    }) as any);

    const rows: any[] = (response.data?.rows || response.rows) || [];
    const byQuery = new Map<string, any>();
    for (const r of rows) byQuery.set(String(r.keys[0]).toLowerCase(), r);

    // Snapshot date = end of the GSC window (normalized to date-only).
    const snapDate = new Date(fmt(endDate));

    let recorded = 0;
    await Promise.all(
      tracked.map(async (kw) => {
        const r = byQuery.get(kw.query.toLowerCase());
        if (!r) return; // no impressions for this keyword in the window
        await prisma.keywordSnapshot.upsert({
          where: { keywordId_date: { keywordId: kw.id, date: snapDate } },
          create: {
            keywordId: kw.id,
            date: snapDate,
            position: r.position ?? 0,
            clicks: Math.round(r.clicks ?? 0),
            impressions: Math.round(r.impressions ?? 0),
            ctr: r.ctr ?? 0,
          },
          update: {
            position: r.position ?? 0,
            clicks: Math.round(r.clicks ?? 0),
            impressions: Math.round(r.impressions ?? 0),
            ctr: r.ctr ?? 0,
          },
        });
        recorded++;
      })
    );

    return NextResponse.json({ ok: true, recorded });
  } catch (error: any) {
    const detail = error?.response?.data?.error?.message || error?.message || "Unknown error";
    console.error("Keyword snapshot error:", detail);
    return NextResponse.json({ error: `Google: ${detail}` }, { status: 502 });
  }
}
