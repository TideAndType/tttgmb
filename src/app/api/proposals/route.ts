import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    const proposals = await prisma.proposal.findMany({
      include: { user: { select: { id: true, name: true, companyName: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(proposals);
  }

  // CLIENT: non-draft proposals for their company
  const companyUserIds = await getCompanyUserIds(user.id);
  const proposals = await prisma.proposal.findMany({
    where: {
      userId: { in: companyUserIds },
      status: { not: "DRAFT" },
    },
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json(proposals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, title, currency, validUntil } = body;

  if (!userId || !title) {
    return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
  }

  const defaultSections = [
    {
      id: `section-${Date.now()}`,
      type: "cover",
      title: title,
      subtitle: "Thank you for considering our services.",
    },
  ];

  const proposal = await prisma.proposal.create({
    data: {
      userId,
      title,
      currency: currency || "USD",
      validUntil: validUntil ? new Date(validUntil) : null,
      sections: defaultSections as any,
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
