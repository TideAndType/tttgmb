import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, generateURI, verifySync } from "otplib";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// Returns whether 2FA is currently enabled for the signed-in user.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } });
  return NextResponse.json({ enabled: !!user?.totpEnabled });
}

// Begin enrollment: generate a fresh secret (stored but not yet enabled) and a QR code.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const email = (session.user as any).email as string;

  const action = (await req.json().catch(() => ({})))?.action;

  if (action === "begin") {
    const secret = generateSecret();
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: false } });
    const otpauth = generateURI({ issuer: "Tide and Type Portal", label: email, secret });
    const qr = await QRCode.toDataURL(otpauth);
    return NextResponse.json({ secret, qr });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Verify a code against the pending secret and switch 2FA on.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { code } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true } });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Start setup first" }, { status: 400 });
  }
  const result = verifySync({ token: (code || "").replace(/\s/g, ""), secret: user.totpSecret, epochTolerance: 30 });
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  return NextResponse.json({ enabled: true });
}

// Disable 2FA — requires the account password to confirm.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { password } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password || !(await bcrypt.compare(password || "", user.password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } });
  return NextResponse.json({ enabled: false });
}
