import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const proposal = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!proposal || proposal.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (proposal.status !== "SENT" && proposal.status !== "VIEWED") {
    return NextResponse.json({ error: "Proposal cannot be responded to" }, { status: 400 });
  }

  const body = await req.json();
  const { action, name } = body;

  if (action === "accept") {
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "ACCEPTED", respondedAt: new Date(), acceptedBy: name },
    });
    return NextResponse.json(updated);
  }

  if (action === "decline") {
    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
