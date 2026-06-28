import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL("/reports?error=invalid_callback", process.env.NEXTAUTH_URL || req.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GA_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: state },
      data: {
        gaAccessToken: tokens.access_token,
        gaRefreshToken: tokens.refresh_token,
      },
    });

    return NextResponse.redirect(new URL("/reports?ga_connected=true", process.env.NEXTAUTH_URL || req.url));
  } catch (error) {
    console.error("GA callback error:", error);
    return NextResponse.redirect(new URL("/reports?error=oauth_failed", process.env.NEXTAUTH_URL || req.url));
  }
}
