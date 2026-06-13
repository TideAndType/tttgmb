import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, company, source, status, value, notes, tags } = body;

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(company !== undefined && { company }),
      ...(source !== undefined && { source }),
      ...(status !== undefined && { status }),
      ...(value !== undefined && { value: value !== null ? parseFloat(value) : null }),
      ...(notes !== undefined && { notes }),
      ...(tags !== undefined && { tags }),
    },
    include: { activities: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.lead.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
