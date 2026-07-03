import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { getAgencyScope } from "@/lib/agency-scope";
import { generateInvoice, advanceInvoiceDate } from "@/lib/generate-invoice";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
    const scope = await getAgencyScope(session);
    const invoices = await prisma.invoice.findMany({
      where: scope.clientUserIds === null ? {} : { userId: { in: scope.clientUserIds } },
      include: {
        user: { select: { id: true, name: true, companyName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  }

  // CLIENT — all invoices for their company
  const companyUserIds = await getCompanyUserIds(user.id);
  const invoices = await prisma.invoice.findMany({
    where: { userId: { in: companyUserIds } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, items, currency, dueDate, invoiceDate, number, notes, taxes, discount, status, recurrence, billTime } = body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "userId and items are required" }, { status: 400 });
  }

  const invoice = await generateInvoice({
    userId, items, currency, dueDate, invoiceDate, number, notes, taxes, discount, status,
  });

  // If this invoice billed the client's logged time, mark those entries as
  // billed so the task/project shows "Billed" vs "New" time going forward.
  if (billTime) {
    const companyUserIds = await getCompanyUserIds(userId);
    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true } }),
      prisma.task.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true } }),
    ]);
    const or: any[] = [];
    if (projects.length) or.push({ projectId: { in: projects.map((p) => p.id) } });
    if (tasks.length) or.push({ taskId: { in: tasks.map((t) => t.id) } });
    if (or.length) {
      await prisma.timeEntry.updateMany({
        where: { billedAt: null, OR: or },
        data: { billedAt: new Date(), invoiceId: (invoice as any).id },
      });
    }
  }

  // If marked recurring, persist a schedule that the cron will run going forward.
  if (recurrence && ["weekly", "monthly", "quarterly"].includes(recurrence)) {
    const base = invoiceDate ? new Date(invoiceDate) : new Date();
    await prisma.recurringInvoice.create({
      data: {
        userId,
        items,
        currency: currency ?? "USD",
        notes: notes ?? null,
        taxes: taxes ?? undefined,
        discount: discount ?? undefined,
        interval: recurrence,
        nextRunAt: advanceInvoiceDate(base, recurrence),
      },
    });
  }

  return NextResponse.json(invoice, { status: 201 });
}
