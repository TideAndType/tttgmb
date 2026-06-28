import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gscAccessToken || !user?.gscRefreshToken) {
    return NextResponse.json({ error: "GSC not connected" }, { status: 400 });
  }

  if (!user.gscProperty) {
    return NextResponse.json({ error: "GSC property not assigned" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    const auth = getOAuth2Client(user.gscAccessToken, user.gscRefreshToken);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (type === "keywords") {
      const response = await (searchconsole.searchanalytics.query({
        siteUrl: user.gscProperty,
        requestBody: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query"],
          rowLimit: 100,
        },
      }) as any);

      const keywords = ((response.data?.rows || response.rows) || []).map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        ctr: row.ctr,
      }));

      return NextResponse.json({ keywords });
    }

    // Default: date-based chart data
    const response = await (searchconsole.searchanalytics.query({
      siteUrl: user.gscProperty,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ["date"],
        rowLimit: 90,
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
