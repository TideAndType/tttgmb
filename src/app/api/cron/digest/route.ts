import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigestEmail } from "@/lib/email";
import { getCompanyUserIds } from "@/lib/company";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const portalBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // One digest per client account that wants it. Companies share data, so we
  // send to each opted-in client user (covers solo clients and team members alike).
  const recipients = await prisma.user.findMany({
    where: { role: "CLIENT", notifyWeeklyDigest: true },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;

  for (const user of recipients) {
    if (!user.email) continue;
    const companyIds = await getCompanyUserIds(user.id);
    const ownerFilter = { userId: { in: companyIds } };
    const projects = await prisma.project.findMany({ where: ownerFilter, select: { id: true } });
    const projectIds = projects.map((p) => p.id);

    const [tasks, proposalsAccepted, invoices, approvals, messages, minutes] = await Promise.all([
      prisma.task.count({ where: { ...ownerFilter, visibleToClient: true, createdAt: { gte: weekAgo } } }),
      prisma.proposal.count({ where: { ...ownerFilter, status: "ACCEPTED", respondedAt: { gte: weekAgo } } }),
      prisma.invoice.count({ where: { ...ownerFilter, createdAt: { gte: weekAgo } } }),
      prisma.deliverable.count({ where: { ...ownerFilter, createdAt: { gte: weekAgo } } }),
      projectIds.length ? prisma.message.count({ where: { projectId: { in: projectIds }, createdAt: { gte: weekAgo } } }) : Promise.resolve(0),
      prisma.timeEntry.aggregate({ where: { ...ownerFilter, createdAt: { gte: weekAgo } }, _sum: { minutes: true } }),
    ]);

    const lines: string[] = [];
    if (tasks) lines.push(`<strong>${tasks}</strong> new task${tasks === 1 ? "" : "s"}`);
    if (messages) lines.push(`<strong>${messages}</strong> new message${messages === 1 ? "" : "s"}`);
    if (approvals) lines.push(`<strong>${approvals}</strong> item${approvals === 1 ? "" : "s"} awaiting your approval`);
    if (invoices) lines.push(`<strong>${invoices}</strong> new invoice${invoices === 1 ? "" : "s"}`);
    if (proposalsAccepted) lines.push(`<strong>${proposalsAccepted}</strong> proposal${proposalsAccepted === 1 ? "" : "s"} accepted`);
    const hrs = (minutes._sum.minutes ?? 0) / 60;
    if (hrs > 0) lines.push(`<strong>${hrs.toFixed(1)}h</strong> of work logged`);

    // Skip quiet weeks — no email when nothing happened.
    if (lines.length === 0) continue;

    await sendWeeklyDigestEmail(user.email, user.name || "there", lines, `${portalBase}/activity`);
    sent++;
  }

  return NextResponse.json({ recipients: recipients.length, sent });
}
