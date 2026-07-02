import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export interface ClientActivityEvent {
  id: string;
  type: string;
  category: string; // messages | comments | files | tasks | proposals | billing | approvals | time
  description: string;
  timestamp: string;
  href?: string;
}

// Activity feed scoped to the signed-in client's own company.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const impersonating = !!(viewing && (user.role === "ADMIN" || user.role === "SUPER_ADMIN"));

  // Admins/super-admins use the admin activity feed — unless they're viewing a
  // client (impersonating), in which case show that client's activity.
  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && !impersonating) {
    return NextResponse.json({ error: "Use /api/admin/activity" }, { status: 403 });
  }

  const effectiveUserId = impersonating ? viewing! : user.id;
  const companyUserIds = await getCompanyUserIds(effectiveUserId);
  const ownerFilter = { userId: { in: companyUserIds } };

  const [tasks, proposals, invoices, deliverables, approvalComments, timeEntries, projects] =
    await Promise.all([
      prisma.task.findMany({ where: { ...ownerFilter, visibleToClient: true }, take: 30, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true } }),
      prisma.proposal.findMany({ where: { ...ownerFilter, status: { notIn: ["DRAFT"] } }, take: 30, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, sentAt: true, respondedAt: true, updatedAt: true } }),
      prisma.invoice.findMany({ where: ownerFilter, take: 30, orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, totalAmount: true, currency: true, createdAt: true, updatedAt: true, sentAt: true } }),
      prisma.deliverable.findMany({ where: ownerFilter, take: 30, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true } }),
      prisma.approvalComment.findMany({ where: { action: { in: ["approved", "changes_requested"] }, deliverable: { is: ownerFilter } }, take: 20, orderBy: { createdAt: "desc" }, include: { deliverable: { select: { title: true } } } }),
      prisma.timeEntry.findMany({ where: ownerFilter, take: 30, orderBy: { createdAt: "desc" }, include: { task: { select: { title: true } } } }),
      prisma.project.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true, name: true } }),
    ]);

  const projectIds = projects.map((p) => p.id);
  const [messages, taskComments, fileComments, chatMessages, files] = await Promise.all([
    projectIds.length
      ? prisma.message.findMany({ where: { projectId: { in: projectIds } }, take: 20, orderBy: { createdAt: "desc" }, include: { project: { select: { id: true, name: true } } } })
      : Promise.resolve([]),
    prisma.taskComment.findMany({ where: { task: { is: { ...ownerFilter, visibleToClient: true } } }, take: 20, orderBy: { createdAt: "desc" }, include: { task: { select: { id: true, title: true } } } }),
    prisma.fileComment.findMany({ where: { asset: { is: ownerFilter } }, take: 20, orderBy: { createdAt: "desc" }, include: { asset: { select: { originalName: true } } } }),
    projectIds.length
      ? prisma.projectChatMessage.findMany({ where: { projectId: { in: projectIds } }, take: 20, orderBy: { createdAt: "desc" }, include: { project: { select: { id: true, name: true } } } })
      : Promise.resolve([]),
    prisma.brandAsset.findMany({ where: ownerFilter, take: 20, orderBy: { createdAt: "desc" }, select: { id: true, originalName: true, createdAt: true } }),
  ]);

  const events: ClientActivityEvent[] = [];

  for (const t of tasks) {
    events.push({ id: `task-${t.id}`, type: "task_created", category: "tasks", description: `Task created: "${t.title}"`, timestamp: t.createdAt.toISOString(), href: "/tasks" });
  }
  for (const p of proposals) {
    if (p.status === "SENT" || p.status === "VIEWED") {
      events.push({ id: `prop-sent-${p.id}`, type: "proposal_sent", category: "proposals", description: `Proposal received: "${p.title}"`, timestamp: (p.sentAt ?? p.updatedAt).toISOString(), href: `/proposals/${p.id}` });
    } else if (p.status === "ACCEPTED") {
      events.push({ id: `prop-acc-${p.id}`, type: "proposal_accepted", category: "proposals", description: `Proposal accepted: "${p.title}"`, timestamp: (p.respondedAt ?? p.updatedAt).toISOString(), href: `/proposals/${p.id}` });
    } else if (p.status === "DECLINED") {
      events.push({ id: `prop-dec-${p.id}`, type: "proposal_declined", category: "proposals", description: `Proposal declined: "${p.title}"`, timestamp: (p.respondedAt ?? p.updatedAt).toISOString(), href: `/proposals/${p.id}` });
    }
  }
  for (const inv of invoices) {
    events.push({ id: `inv-${inv.id}`, type: "invoice_created", category: "billing", description: `Invoice${inv.number ? " #" + inv.number : ""} issued`, timestamp: inv.createdAt.toISOString(), href: "/invoices" });
    if (inv.status === "Paid") {
      events.push({ id: `inv-paid-${inv.id}`, type: "invoice_paid", category: "billing", description: `Invoice${inv.number ? " #" + inv.number : ""} marked paid`, timestamp: (inv.sentAt ?? inv.updatedAt).toISOString(), href: "/invoices" });
    }
  }
  for (const d of deliverables) {
    events.push({ id: `appr-${d.id}`, type: "approval_created", category: "approvals", description: `Approval requested: "${d.title}"`, timestamp: d.createdAt.toISOString(), href: "/approvals" });
  }
  for (const c of approvalComments) {
    events.push({
      id: `apprc-${c.id}`,
      type: c.action === "approved" ? "approval_approved" : "approval_changes",
      category: "approvals",
      description: c.action === "approved" ? `Approved: "${c.deliverable.title}"` : `Changes requested: "${c.deliverable.title}"`,
      timestamp: c.createdAt.toISOString(),
      href: "/approvals",
    });
  }
  for (const m of messages) {
    events.push({ id: `msg-${m.id}`, type: "message_posted", category: "messages", description: `Message: "${m.title}" in ${m.project.name}`, timestamp: m.createdAt.toISOString(), href: `/projects/${m.project.id}/messages/${m.id}` });
  }
  for (const cm of chatMessages) {
    events.push({ id: `chat-${cm.id}`, type: "chat_posted", category: "messages", description: `${cm.authorName} in ${cm.project.name}: "${cm.body.slice(0, 80)}"`, timestamp: cm.createdAt.toISOString(), href: `/projects/${cm.project.id}` });
  }
  for (const tc of taskComments) {
    events.push({ id: `tc-${tc.id}`, type: "comment_posted", category: "comments", description: `${tc.authorName} commented on "${tc.task.title}": "${tc.body.slice(0, 80)}"`, timestamp: tc.createdAt.toISOString(), href: "/tasks" });
  }
  for (const fc of fileComments) {
    events.push({ id: `fc-${fc.id}`, type: "comment_posted", category: "comments", description: `${fc.authorName} commented on ${fc.asset.originalName}: "${fc.body.slice(0, 80)}"`, timestamp: fc.createdAt.toISOString(), href: "/files" });
  }
  for (const f of files) {
    events.push({ id: `file-${f.id}`, type: "file_uploaded", category: "files", description: `File added: ${f.originalName}`, timestamp: f.createdAt.toISOString(), href: "/files" });
  }
  for (const e of timeEntries) {
    events.push({ id: `time-${e.id}`, type: "time_logged", category: "time", description: `${(e.minutes / 60).toFixed(1)}h logged${e.task ? ` on "${e.task.title}"` : ""}`, timestamp: e.createdAt.toISOString(), href: "/time" });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ events: events.slice(0, 60) });
}
