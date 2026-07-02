import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

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

  // Resolve the requested reporting window. Supports preset ranges plus a
  // custom start/end. Defaults to the last 90 days.
  function resolveRange(): { startDate: Date; endDate: Date; label: string } {
    const range = searchParams.get("range") || "90d";
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (range) {
      case "30d":
        start.setDate(start.getDate() - 30);
        return { startDate: start, endDate: end, label: "last 30 days" };
      case "120d":
        start.setDate(start.getDate() - 120);
        return { startDate: start, endDate: end, label: "last 120 days" };
      case "thisYear":
        return { startDate: new Date(now.getFullYear(), 0, 1), endDate: end, label: "this year" };
      case "lastYear":
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1),
          endDate: new Date(now.getFullYear() - 1, 11, 31),
          label: "last year",
        };
      case "custom": {
        const s = searchParams.get("start");
        const e = searchParams.get("end");
        if (s && e) return { startDate: new Date(s), endDate: new Date(e), label: "custom range" };
        start.setDate(start.getDate() - 90);
        return { startDate: start, endDate: end, label: "last 90 days" };
      }
      case "90d":
      default:
        start.setDate(start.getDate() - 90);
        return { startDate: start, endDate: end, label: "last 90 days" };
    }
  }

  try {
    const auth = getOAuth2Client(user.gscAccessToken, user.gscRefreshToken);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const { startDate, endDate, label: rangeLabel } = resolveRange();

    if (type === "keywords") {
      // Preceding period of equal length, ending the day before the current
      // window, so we can show previous vs current position per keyword.
      const spanMs = endDate.getTime() - startDate.getTime();
      const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - spanMs);

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

    // Default: date-based chart data
    const response = await (searchconsole.searchanalytics.query({
      siteUrl: user.gscProperty,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ["date"],
        rowLimit: 500,
      },
    }) as any);

    const rows = ((response.data?.rows || response.rows) || []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
      ctr: row.ctr,
    }));

    const totals = rows.reduce(
      (acc: any, row: any) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        avgPosition: acc.avgPosition + row.position,
        avgCtr: acc.avgCtr + row.ctr,
      }),
      { clicks: 0, impressions: 0, avgPosition: 0, avgCtr: 0 }
    );

    if (rows.length > 0) {
      totals.avgPosition = totals.avgPosition / rows.length;
      totals.avgCtr = totals.avgCtr / rows.length;
    }

    return NextResponse.json({ rows, totals });
  } catch (error: any) {
    console.error("GSC data error:", error);
    return NextResponse.json({ error: "Failed to fetch GSC data" }, { status: 500 });
  }
}
