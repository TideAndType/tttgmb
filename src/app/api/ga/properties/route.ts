import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

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

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GA_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.gaAccessToken,
    refresh_token: user.gaRefreshToken,
  });

  try {
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: oauth2Client });
    const response = await analyticsAdmin.properties.list({
      filter: "parent:accounts/-",
    });

    const properties = (response.data.properties || []).map((p: any) => ({
      name: p.name,
      displayName: p.displayName,
    }));

    return NextResponse.json({ properties });
  } catch (error: any) {
    console.error("GA properties error:", error);
    return NextResponse.json({ error: "Failed to fetch GA properties" }, { status: 500 });
  }
}
