import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProposalSentEmail } from "@/lib/email";
import { createNotification, createNotificationForAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, companyName: true, email: true } } },
  });

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "CLIENT") {
    if (proposal.userId !== user.id || proposal.status === "DRAFT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(proposal);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const proposal = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.action === "send") {
    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "SENT", sentAt: new Date() },
      include: { user: { select: { email: true, name: true, notifyProposalSent: true } } },
    });
    try {
      const portalUrl = `${process.env.NEXTAUTH_URL || ""}/proposals`;
      createNotification(updated.userId, "proposal_sent", "New proposal to review", updated.title, "/proposals");
      if (updated.user.notifyProposalSent) await sendProposalSentEmail(updated.user.email, updated.user.name, updated.title, portalUrl);
    } catch (err) {
      console.error("Email notification failed:", err);
    }
    return NextResponse.json(updated);
  }

  const { title, sections, totalAmount, validUntil, currency, notes, status, brand } = body;

  const updated = await prisma.proposal.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(sections !== undefined && { sections }),
      ...(totalAmount !== undefined && { totalAmount }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      ...(currency !== undefined && { currency }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
      ...(brand !== undefined && { brand }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.proposal.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
