import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { resolveRange, previousPeriod } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function getOAuth2Client(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const __u = session.user as any;
  const __viewing = cookies().get("adminViewingAs")?.value;
  const userId = (__viewing && (__u.role === "ADMIN" || __u.role === "SUPER_ADMIN")) ? __viewing : __u.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gscAccessToken || !user?.gscRefreshToken) {
    return NextResponse.json({ error: "GSC not connected" }, { status: 400 });
  }

  if (!user.gscProperty) {
    return NextResponse.json({ error: "GSC property not assigned" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  try {
    const auth = getOAuth2Client(user.gscAccessToken, user.gscRefreshToken);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const resolved = resolveRange(searchParams);
    const { startDate, endDate, label: rangeLabel } = resolved;

    if (type === "keywords") {
      // Preceding period of equal length so we can show previous vs current
      // position per keyword.
      const { startDate: prevStart, endDate: prevEnd } = previousPeriod(resolved);

      const queryFor = (s: Date, e: Date) =>
        (searchconsole.searchanalytics.query({
          siteUrl: user.gscProperty!,
          requestBody: {
            startDate: formatDate(s),
            endDate: formatDate(e),
            dimensions: ["query"],
            rowLimit: 250,
          },
        }) as any);

      const [current, previous] = await Promise.all([
        queryFor(startDate, endDate),
        queryFor(prevStart, prevEnd),
      ]);

      const prevByQuery = new Map<string, number>();
      for (const row of (previous.data?.rows || previous.rows || [])) {
        prevByQuery.set(String(row.keys[0]).toLowerCase(), row.position);
      }

      const keywords = ((current.data?.rows || current.rows) || []).map((row: any) => {
        const prevPosition = prevByQuery.get(String(row.keys[0]).toLowerCase()) ?? null;
        // Positive change = improved rank (moved toward #1).
        const positionChange =
          prevPosition !== null ? Number((prevPosition - row.position).toFixed(1)) : null;
        return {
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position,
          prevPosition,
          positionChange,
          ctr: row.ctr,
        };
      });

      return NextResponse.json({ keywords, rangeLabel });
    }

    // Default: date-based chart data, with a preceding equal-length period so
    // the overview can show period-over-period deltas.
    const queryDates = (s: Date, e: Date) =>
      (searchconsole.searchanalytics.query({
        siteUrl: user.gscProperty!,
        requestBody: {
          startDate: formatDate(s),
          endDate: formatDate(e),
          dimensions: ["date"],
          rowLimit: 500,
        },
      }) as any);

    const { startDate: prevStart, endDate: prevEnd } = previousPeriod(resolved);

    const [response, prevResponse] = await Promise.all([
      queryDates(startDate, endDate),
      queryDates(prevStart, prevEnd),
    ]);

    const rows = ((response.data?.rows || response.rows) || []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
      ctr: row.ctr,
    }));

    const sumTotals = (rws: any[]) => {
      const t = rws.reduce(
        (acc: any, row: any) => ({
          clicks: acc.clicks + row.clicks,
          impressions: acc.impressions + row.impressions,
          avgPosition: acc.avgPosition + row.position,
          avgCtr: acc.avgCtr + row.ctr,
        }),
        { clicks: 0, impressions: 0, avgPosition: 0, avgCtr: 0 }
      );
      if (rws.length > 0) {
        t.avgPosition = t.avgPosition / rws.length;
        t.avgCtr = t.avgCtr / rws.length;
      }
      return t;
    };

    const totals = sumTotals(rows);
    const prevRows = (prevResponse.data?.rows || prevResponse.rows) || [];
    const prevTotals = sumTotals(prevRows);

    return NextResponse.json({ rows, totals, prevTotals, rangeLabel });
  } catch (error: any) {
    console.error("GSC data error:", error);
    return NextResponse.json({ error: "Failed to fetch GSC data" }, { status: 500 });
  }
}
