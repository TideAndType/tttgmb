import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tasks, deliverables, proposals, invoices, client] = await Promise.all([
    prisma.task.findMany({
      where: { userId: params.id },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true },
    }),
    prisma.deliverable.findMany({
      where: { userId: params.id },
      select: { id: true, title: true, status: true, type: true, createdAt: true },
    }),
    prisma.proposal.findMany({
      where: { userId: params.id },
      select: { id: true, title: true, status: true, createdAt: true, sentAt: true },
    }),
    prisma.invoice.findMany({
      where: { userId: params.id },
      select: { id: true, number: true, status: true, totalAmount: true, currency: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: params.id },
      select: { name: true, companyName: true },
    }),
  ]);

  const events = [
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      status: t.status,
      meta: t.priority ?? "",
      date: t.createdAt.toISOString(),
    })),
    ...deliverables.map((d) => ({
      id: d.id,
      type: "approval" as const,
      title: d.title,
      status: d.status,
      meta: d.type ?? "",
      date: d.createdAt.toISOString(),
    })),
    ...proposals.map((p) => ({
      id: p.id,
      type: "proposal" as const,
      title: p.title,
      status: p.status,
      meta: p.status ?? "",
      date: (p.sentAt ?? p.createdAt).toISOString(),
    })),
    ...invoices.map((i) => ({
      id: i.id,
      type: "invoice" as const,
      title: `Invoice ${i.number ?? ""}`.trim(),
      status: i.status,
      meta: `${i.currency ?? ""} ${i.totalAmount ?? 0}`.trim(),
      date: i.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ client, events });
}
