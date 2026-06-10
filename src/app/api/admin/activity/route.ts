import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface ActivityEvent {
  id: string;
  type:
    | "task_created"
    | "proposal_sent"
    | "proposal_accepted"
    | "proposal_declined"
    | "invoice_created"
    | "invoice_paid"
    | "approval_created"
    | "approval_approved"
    | "approval_changes"
    | "message_posted"
    | "time_logged"
    | "client_login";
  clientId: string;
  clientName: string;
  companyName: string | null;
  description: string;
  timestamp: Date;
  meta?: { href?: string; amount?: number; currency?: string; minutes?: number };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const clientIdFilter = searchParams.get("clientId") || null;
  const typeFilter = searchParams.get("type")
    ? searchParams.get("type")!.split(",")
    : null;
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10),
    100
  );

  const [tasks, proposals, invoices, deliverables, messages, timeEntries, approvalComments, clients] =
    await Promise.all([
      prisma.task.findMany({
        take: 30,
        include: { user: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.proposal.findMany({
        take: 30,
        where: { status: { notIn: ["DRAFT"] } },
        include: { user: { select: { id: true, name: true, companyName: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.invoice.findMany({
        take: 30,
        include: { user: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deliverable.findMany({
        take: 30,
        include: { user: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        take: 20,
        include: { project: { select: { name: true, userId: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.timeEntry.findMany({
        take: 30,
        include: {
          user: { select: { id: true, name: true, companyName: true } },
          task: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.approvalComment.findMany({
        take: 20,
        where: { action: { in: ["approved", "changes_requested"] } },
        include: {
          deliverable: {
            include: { user: { select: { id: true, name: true, companyName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "CLIENT" },
        select: { id: true, name: true, companyName: true },
        orderBy: { name: "asc" },
      }),
    ]);

  // Load users for messages via project.userId
  const projectUserIds = Array.from(new Set(messages.map((m) => m.project.userId)));
  const projectUsers = await prisma.user.findMany({
    where: { id: { in: projectUserIds } },
    select: { id: true, name: true, companyName: true },
  });
  const projectUserMap = new Map(projectUsers.map((u) => [u.id, u]));

  const events: ActivityEvent[] = [];

  // Tasks
  for (const task of tasks) {
    events.push({
      id: `task-${task.id}`,
      type: "task_created",
      clientId: task.user.id,
      clientName: task.user.name,
      companyName: task.user.companyName,
      description: `Created task: "${task.title}"`,
      timestamp: task.createdAt,
    });
  }

  // Proposals
  for (const proposal of proposals) {
    if (proposal.status === "SENT" || proposal.status === "VIEWED") {
      events.push({
        id: `proposal-sent-${proposal.id}`,
        type: "proposal_sent",
        clientId: proposal.user.id,
        clientName: proposal.user.name,
        companyName: proposal.user.companyName,
        description: `Proposal sent: "${proposal.title}"`,
        timestamp: proposal.sentAt ?? proposal.updatedAt,
      });
    } else if (proposal.status === "ACCEPTED") {
      events.push({
        id: `proposal-accepted-${proposal.id}`,
        type: "proposal_accepted",
        clientId: proposal.user.id,
        clientName: proposal.user.name,
        companyName: proposal.user.companyName,
        description: `Accepted proposal: "${proposal.title}"`,
        timestamp: proposal.respondedAt ?? proposal.updatedAt,
      });
    } else if (proposal.status === "DECLINED") {
      events.push({
        id: `proposal-declined-${proposal.id}`,
        type: "proposal_declined",
        clientId: proposal.user.id,
        clientName: proposal.user.name,
        companyName: proposal.user.companyName,
        description: `Declined proposal: "${proposal.title}"`,
        timestamp: proposal.respondedAt ?? proposal.updatedAt,
      });
    }
  }

  // Invoices
  for (const invoice of invoices) {
    events.push({
      id: `invoice-created-${invoice.id}`,
      type: "invoice_created",
      clientId: invoice.user.id,
      clientName: invoice.user.name,
      companyName: invoice.user.companyName,
      description: `Invoice${invoice.number ? " #" + invoice.number : ""} created`,
      timestamp: invoice.createdAt,
      meta: {
        amount: invoice.totalAmount ?? undefined,
        currency: invoice.currency,
      },
    });
    if (invoice.status === "Paid") {
      events.push({
        id: `invoice-paid-${invoice.id}`,
        type: "invoice_paid",
        clientId: invoice.user.id,
        clientName: invoice.user.name,
        companyName: invoice.user.companyName,
        description: `Invoice${invoice.number ? " #" + invoice.number : ""} paid`,
        timestamp: invoice.sentAt ?? invoice.updatedAt,
        meta: {
          amount: invoice.totalAmount ?? undefined,
          currency: invoice.currency,
        },
      });
    }
  }

  // Deliverables
  for (const deliverable of deliverables) {
    events.push({
      id: `approval-created-${deliverable.id}`,
      type: "approval_created",
      clientId: deliverable.user.id,
      clientName: deliverable.user.name,
      companyName: deliverable.user.companyName,
      description: `Approval request: "${deliverable.title}"`,
      timestamp: deliverable.createdAt,
    });
  }

  // ApprovalComments
  for (const comment of approvalComments) {
    const user = comment.deliverable.user;
    if (comment.action === "approved") {
      events.push({
        id: `approval-approved-${comment.id}`,
        type: "approval_approved",
        clientId: user.id,
        clientName: user.name,
        companyName: user.companyName,
        description: `Approved: "${comment.deliverable.title}"`,
        timestamp: comment.createdAt,
      });
    } else if (comment.action === "changes_requested") {
      events.push({
        id: `approval-changes-${comment.id}`,
        type: "approval_changes",
        clientId: user.id,
        clientName: user.name,
        companyName: user.companyName,
        description: `Requested changes: "${comment.deliverable.title}"`,
        timestamp: comment.createdAt,
      });
    }
  }

  // Messages
  for (const message of messages) {
    const user = projectUserMap.get(message.project.userId);
    if (!user) continue;
    events.push({
      id: `message-${message.id}`,
      type: "message_posted",
      clientId: user.id,
      clientName: user.name,
      companyName: user.companyName,
      description: `Posted message: "${message.title}" in ${message.project.name}`,
      timestamp: message.createdAt,
    });
  }

  // Time entries
  for (const entry of timeEntries) {
    events.push({
      id: `time-${entry.id}`,
      type: "time_logged",
      clientId: entry.user.id,
      clientName: entry.user.name,
      companyName: entry.user.companyName,
      description: `Logged ${(entry.minutes / 60).toFixed(1)}h${entry.task ? ` on "${entry.task.title}"` : ""}`,
      timestamp: entry.createdAt,
      meta: { minutes: entry.minutes },
    });
  }

  // Sort all events desc
  let sorted = events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply filters
  if (clientIdFilter) {
    sorted = sorted.filter((e) => e.clientId === clientIdFilter);
  }
  if (typeFilter && typeFilter.length > 0) {
    sorted = sorted.filter((e) => typeFilter.includes(e.type));
  }

  return NextResponse.json({
    events: sorted.slice(0, limit),
    clients,
  });
}
