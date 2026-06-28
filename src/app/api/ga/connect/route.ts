import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GA_CLIENT_ID,
    process.env.GA_CLIENT_SECRET,
    process.env.GA_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/analytics.readonly"],
    prompt: "consent",
    // When an admin/super-admin is viewing a client, attach the connection to that client.
    state: (() => { const u = session.user as any; const v = cookies().get("adminViewingAs")?.value; return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id; })(),
  });

  return NextResponse.json({ url });
}
