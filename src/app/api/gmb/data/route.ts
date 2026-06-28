import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

function formatDateParts(d: Date) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

async function getAccessToken(user: any): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(process.env.GA_CLIENT_ID, process.env.GA_CLIENT_SECRET, process.env.GMB_REDIRECT_URI);
  oauth2Client.setCredentials({ access_token: user.gmbAccessToken, refresh_token: user.gmbRefreshToken });
  await oauth2Client.getAccessToken();
  if (oauth2Client.credentials.access_token !== user.gmbAccessToken) {
    await prisma.user.update({ where: { id: user.id }, data: { gmbAccessToken: oauth2Client.credentials.access_token } });
  }
  return oauth2Client.credentials.access_token!;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gmbAccessToken || !user?.gmbRefreshToken) return NextResponse.json({ error: "GMB not connected" }, { status: 400 });
  if (!user?.gmbLocationId) return NextResponse.json({ error: "GMB location not selected" }, { status: 400 });

  try {
    const token = await getAccessToken(user);
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);

    const [locationRes, metricsRes] = await Promise.all([
      fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${user.gmbLocationId}?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers`, { headers }),
      fetch(`https://businessprofileperformance.googleapis.com/v1/${user.gmbLocationId}:fetchMultiDailyMetricsTimeSeries`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dailyMetrics: ["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", "CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS"],
          dailyRange: { startDate: formatDateParts(startDate), endDate: formatDateParts(endDate) },
        }),
      }),
    ]);

    const locationData = locationRes.ok ? await locationRes.json() : null;
    const metricsData = metricsRes.ok ? await metricsRes.json() : null;

    // Format location
    const addr = locationData?.storefrontAddress;
    const address = addr ? [addr.addressLines?.[0], addr.locality, addr.administrativeArea, addr.postalCode].filter(Boolean).join(", ") : null;
    const location = {
      name: locationData?.title || "My Business",
      address,
      website: locationData?.websiteUri || null,
      phone: locationData?.phoneNumbers?.primaryPhone || null,
    };

    // Parse time series from multiDailyMetricsTimeSeries
    const seriesMap: Record<string, { date: string; impressions: number; websiteClicks: number; callClicks: number; directionRequests: number }> = {};

    const metricMap: Record<string, string> = {
      BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "impressions",
      BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "impressions",
      CALL_CLICKS: "callClicks",
      WEBSITE_CLICKS: "websiteClicks",
      BUSINESS_DIRECTION_REQUESTS: "directionRequests",
    };

    for (const series of metricsData?.multiDailyMetricTimeSeries || []) {
      const metricKey = metricMap[series.dailyMetric];
      if (!metricKey) continue;
      for (const pt of series.timeSeries?.datedValues || []) {
        const d = pt.date;
        const dateStr = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        if (!seriesMap[dateStr]) seriesMap[dateStr] = { date: dateStr, impressions: 0, websiteClicks: 0, callClicks: 0, directionRequests: 0 };
        (seriesMap[dateStr] as any)[metricKey] += parseInt(pt.value || "0");
      }
    }

    const timeSeries = Object.values(seriesMap).sort((a, b) => a.date.localeCompare(b.date));

    const metrics = timeSeries.reduce((acc, d) => ({
      totalImpressions: acc.totalImpressions + d.impressions,
      websiteClicks: acc.websiteClicks + d.websiteClicks,
      callClicks: acc.callClicks + d.callClicks,
      directionRequests: acc.directionRequests + d.directionRequests,
    }), { totalImpressions: 0, websiteClicks: 0, callClicks: 0, directionRequests: 0 });

    return NextResponse.json({ location, metrics, timeSeries });
  } catch (err: any) {
    console.error("GMB data error:", err);
    return NextResponse.json({ error: "Failed to fetch GMB data" }, { status: 500 });
  }
}
