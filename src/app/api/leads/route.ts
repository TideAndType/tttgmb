import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    include: { activities: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, company, source, status, value, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      source: source || "OTHER",
      status: status || "NEW",
      value: value ? parseFloat(value) : null,
      notes: notes || null,
    },
    include: { activities: true },
  });

  return NextResponse.json(lead, { status: 201 });
}
