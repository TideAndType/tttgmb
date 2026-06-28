import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET — list team members in the same company
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!me?.companyId) return NextResponse.json({ members: [] });

  const members = await prisma.user.findMany({
    where: { companyId: me.companyId },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

// POST — invite a new team member
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { firstName, lastName, email } = await req.json();

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true, companyName: true, name: true },
  });

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let companyId = me.companyId;

  if (!companyId) {
    const company = await prisma.company.create({
      data: { name: me.companyName || me.name },
    });
    companyId = company.id;
    await prisma.user.update({ where: { id: userId }, data: { companyId } });
  }

  // Create account with a random placeholder password — they'll set their own via invite link
  const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);

  const newUser = await prisma.user.create({
    data: {
      name: `${firstName.trim()} ${lastName.trim()}`,
      email,
      password: tempPassword,
      role: "CLIENT",
      companyId,
    },
  });

  // Generate a password reset token so they can set their own password
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: newUser.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendPasswordResetEmail(email, newUser.name, resetUrl);

  return NextResponse.json({ id: newUser.id }, { status: 201 });
}

// DELETE — remove a team member (only if same company, can't remove yourself)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { memberId } = await req.json();

  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  if (memberId === userId) return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });

  const [me, member] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
    prisma.user.findUnique({ where: { id: memberId }, select: { companyId: true } }),
  ]);

  if (!me?.companyId || member?.companyId !== me.companyId) {
    return NextResponse.json({ error: "Member not in your team" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: memberId }, data: { companyId: null } });

  return NextResponse.json({ success: true });
}
