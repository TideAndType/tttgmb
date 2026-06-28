import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) return NextResponse.redirect(new URL("/gmb?error=invalid_callback", process.env.NEXTAUTH_URL || req.url));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GMB_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    await prisma.user.update({
      where: { id: state },
      data: { gmbAccessToken: tokens.access_token, gmbRefreshToken: tokens.refresh_token },
    });
    return NextResponse.redirect(new URL("/gmb?gmb_connected=true", process.env.NEXTAUTH_URL || req.url));
  } catch (err) {
    console.error("GMB callback error:", err);
    return NextResponse.redirect(new URL("/gmb?error=oauth_failed", process.env.NEXTAUTH_URL || req.url));
  }
}
