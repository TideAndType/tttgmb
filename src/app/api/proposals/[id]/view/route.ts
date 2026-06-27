import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificationForAdmins } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const proposal = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!proposal || proposal.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const firstView = proposal.status === "SENT";
  const updated = await prisma.proposal.update({
    where: { id: params.id },
    data: {
      // First view flips SENT -> VIEWED and stamps viewedAt
      ...(firstView ? { status: "VIEWED", viewedAt: now } : {}),
      ...(proposal.viewedAt ? {} : { viewedAt: now }),
      lastViewedAt: now,
      viewCount: { increment: 1 },
    },
  });

  // Notify admins the first time the client opens the proposal
  if (firstView) {
    createNotificationForAdmins("proposal_viewed", "Proposal viewed", `${user.name ?? "Client"} viewed "${proposal.title}"`, "/admin/proposals");
    dispatchWebhook("proposal.viewed", { id: proposal.id, title: proposal.title, clientId: user.id, clientName: user.name });
  }

  return NextResponse.json(updated);
}
