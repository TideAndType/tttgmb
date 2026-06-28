import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProposalRespondedEmail } from "@/lib/email";
import { createNotificationForAdmins } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

async function notifyProposalResponse(
  userId: string,
  proposalTitle: string,
  action: "accepted" | "declined"
) {
  try {
    const [clientUser, adminUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      prisma.user.findFirst({ where: { role: "ADMIN" }, select: { email: true, name: true } }),
    ]);
    if (adminUser && clientUser) {
      const portalUrl = process.env.NEXTAUTH_URL || "";
      await sendProposalRespondedEmail(adminUser.email, adminUser.name, clientUser.name, proposalTitle, action, portalUrl);
    }
  } catch (err) {
    console.error("Email notification failed:", err);
  }
}

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
  const { action, name, signature } = body;

  if (action === "accept") {
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    // Validate the signature image if provided (must be a PNG data URL, capped in size).
    let signatureData: string | null = null;
    if (typeof signature === "string" && signature.startsWith("data:image/png;base64,")) {
      if (signature.length > 1_000_000) {
        return NextResponse.json({ error: "Signature image too large" }, { status: 400 });
      }
      signatureData = signature;
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "ACCEPTED", respondedAt: new Date(), acceptedBy: name, signatureData, acceptedByIp: ip },
    });
    await notifyProposalResponse(user.id, proposal.title, "accepted");
    createNotificationForAdmins("proposal_accepted", "Proposal accepted", `${user.name ?? "Client"} accepted "${proposal.title}"`, "/admin/proposals");
    dispatchWebhook("proposal.accepted", { id: proposal.id, title: proposal.title, clientId: user.id, clientName: user.name, acceptedBy: name });
    return NextResponse.json(updated);
  }

  if (action === "decline") {
    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await notifyProposalResponse(user.id, proposal.title, "declined");
    createNotificationForAdmins("proposal_declined", "Proposal declined", `${user.name ?? "Client"} declined "${proposal.title}"`, "/admin/proposals");
    dispatchWebhook("proposal.declined", { id: proposal.id, title: proposal.title, clientId: user.id, clientName: user.name });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
