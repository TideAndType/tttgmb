import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL("/seo?error=invalid_callback", process.env.NEXTAUTH_URL || req.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: state },
      data: {
        gscAccessToken: tokens.access_token,
        gscRefreshToken: tokens.refresh_token,
      },
    });

    return NextResponse.redirect(new URL("/seo?connected=true", process.env.NEXTAUTH_URL || req.url));
  } catch (error) {
    console.error("GSC callback error:", error);
    return NextResponse.redirect(new URL("/seo?error=oauth_failed", process.env.NEXTAUTH_URL || req.url));
  }
}
