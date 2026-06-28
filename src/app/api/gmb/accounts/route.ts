import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

async function getAccessToken(user: any): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GMB_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: user.gmbAccessToken, refresh_token: user.gmbRefreshToken });
  const { token } = await oauth2Client.getAccessToken();
  if (oauth2Client.credentials.access_token !== user.gmbAccessToken) {
    await prisma.user.update({ where: { id: user.id }, data: { gmbAccessToken: oauth2Client.credentials.access_token } });
  }
  return token!;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const __u = session.user as any;
  const __viewing = cookies().get("adminViewingAs")?.value;
  const userId = (__viewing && (__u.role === "ADMIN" || __u.role === "SUPER_ADMIN")) ? __viewing : __u.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmbAccessToken) return NextResponse.json({ error: "GMB not connected" }, { status: 400 });

  try {
    const token = await getAccessToken(user);
    const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ accounts: data.accounts || [] });
  } catch (err) {
    console.error("GMB accounts error:", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
