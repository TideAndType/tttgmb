import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, note } = body;

  if (!type || !note) {
    return NextResponse.json({ error: "Type and note are required" }, { status: 400 });
  }

  const activity = await prisma.leadActivity.create({
    data: {
      leadId: params.id,
      type,
      note,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
