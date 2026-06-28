import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.user.findUnique({
    where: { id: params.id },
    select: { companyId: true },
  });

  if (!client?.companyId) {
    return NextResponse.json({ members: [] });
  }

  const members = await prisma.user.findMany({
    where: { companyId: client.companyId, id: { not: params.id } },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  // Get or create the company for this client
  const client = await prisma.user.findUnique({
    where: { id: params.id },
    select: { companyId: true, companyName: true, name: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let companyId = client.companyId;

  if (!companyId) {
    // Create a company for the primary client and link them
    const company = await prisma.company.create({
      data: { name: client.companyName || client.name },
    });
    companyId = company.id;
    await prisma.user.update({
      where: { id: params.id },
      data: { companyId },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "CLIENT",
      companyId,
    },
  });

  return NextResponse.json({ id: newUser.id }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { memberId } = body;

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // Verify the member belongs to the same company as the client
  const client = await prisma.user.findUnique({
    where: { id: params.id },
    select: { companyId: true },
  });

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { companyId: true },
  });

  if (!client?.companyId || member?.companyId !== client.companyId) {
    return NextResponse.json({ error: "Member not in same company" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: memberId },
    data: { companyId: null },
  });

  return NextResponse.json({ success: true });
}
