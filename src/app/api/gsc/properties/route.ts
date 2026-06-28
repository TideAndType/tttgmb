import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const __u = session.user as any;
  const __viewing = cookies().get("adminViewingAs")?.value;
  const userId = (__viewing && (__u.role === "ADMIN" || __u.role === "SUPER_ADMIN")) ? __viewing : __u.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.gscAccessToken || !user?.gscRefreshToken) {
    return NextResponse.json({ error: "GSC not connected" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: user.gscAccessToken, refresh_token: user.gscRefreshToken });

  try {
    const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });
    const res = await searchconsole.sites.list();
    const sites = (res.data.siteEntry || [])
      .map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }))
      .filter((s) => s.permissionLevel !== "siteUnverifiedUser");
    return NextResponse.json({ sites });
  } catch (error) {
    console.error("GSC sites error:", error);
    return NextResponse.json({ error: "Failed to fetch GSC sites" }, { status: 500 });
  }
}
