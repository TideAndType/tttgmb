import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.user.findMany({
    where: { role: { in: ["CLIENT", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyName: true,
      gscProperty: true,
      createdAt: true,
      image: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, companyName } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const company = await prisma.company.create({ data: { name: companyName || name } });

  // Link the new client to the creating admin's agency so agency branding
  // (logo/colors, white-label login) flows to this client's portal.
  const creator = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { agencyId: true } });
  const ownedAgency = creator?.agencyId ? null : await prisma.agency.findFirst({ where: { ownerId: (session.user as any).id }, select: { id: true } });
  const agencyId = creator?.agencyId ?? ownedAgency?.id ?? null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      companyName: companyName || null,
      role: "CLIENT",
      companyId: company.id,
      agencyId,
    },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
