import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

function getOAuth2Client(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GA_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gaAccessToken || !user?.gaRefreshToken) {
    return NextResponse.json({ error: "GA not connected" }, { status: 400 });
  }

  if (!user.gaPropertyId) {
    return NextResponse.json({ error: "GA property not selected" }, { status: 400 });
  }

  const auth = getOAuth2Client(user.gaAccessToken, user.gaRefreshToken);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29);

  try {
    // Fetch aggregate metrics
    const summaryRes = await analyticsData.properties.runReport({
      property: user.gaPropertyId,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "newUsers" },
        ],
      },
    });

    const summaryRow = summaryRes.data.rows?.[0]?.metricValues || [];
    const metrics = {
      sessions: parseInt(summaryRow[0]?.value || "0"),
      users: parseInt(summaryRow[1]?.value || "0"),
      pageviews: parseInt(summaryRow[2]?.value || "0"),
      bounceRate: parseFloat(summaryRow[3]?.value || "0"),
      avgSessionDuration: parseFloat(summaryRow[4]?.value || "0"),
      newUsers: parseInt(summaryRow[5]?.value || "0"),
    };

    // Fetch time series data
    const timeSeriesRes = await analyticsData.properties.runReport({
      property: user.gaPropertyId,
      requestBody: {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    });

    const timeSeries = (timeSeriesRes.data.rows || []).map((row: any) => {
      const rawDate = row.dimensionValues?.[0]?.value || "";
      // date format: YYYYMMDD -> YYYY-MM-DD
      const date = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;
      return {
        date,
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
        pageviews: parseInt(row.metricValues?.[2]?.value || "0"),
      };
    });

    return NextResponse.json({ metrics, timeSeries });
  } catch (error: any) {
    console.error("GA data error:", error);
    return NextResponse.json({ error: "Failed to fetch GA data" }, { status: 500 });
  }
}
