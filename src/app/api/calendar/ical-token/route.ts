import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// Returns (creating if needed) the caller's private iCal subscription token
// and the full webcal/https feed URL to paste into Google/Apple Calendar.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  let user = await prisma.user.findUnique({ where: { id: userId }, select: { icalToken: true } });
  if (!user?.icalToken) {
    const token = randomBytes(24).toString("hex");
    user = await prisma.user.update({ where: { id: userId }, data: { icalToken: token }, select: { icalToken: true } });
  }

  const base = process.env.NEXTAUTH_URL || "";
  const url = `${base}/api/calendar-events/ical?token=${user.icalToken}`;
  return NextResponse.json({ token: user.icalToken, url });
}

// Rotate the token (invalidates any existing subscriptions).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const token = randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: userId }, data: { icalToken: token } });
  const base = process.env.NEXTAUTH_URL || "";
  return NextResponse.json({ token, url: `${base}/api/calendar-events/ical?token=${token}` });
}
