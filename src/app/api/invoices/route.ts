import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/invoiless";
import { sendInvoiceEmail } from "@/lib/email";
import { getCompanyUserIds } from "@/lib/company";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  if (user.role === "ADMIN") {
    const invoices = await prisma.invoice.findMany({
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
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, items, currency, dueDate, invoiceDate, number, notes, taxes, discount, status } = body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "userId and items are required" }, { status: 400 });
  }

  const clientUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!clientUser) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const invoilessData = await createInvoice({
    customer: {
      internalId: userId,
      billTo: {
        company: clientUser.companyName ?? undefined,
        email: clientUser.email,
      },
    },
    items,
    currency: currency ?? "USD",
    dueDate: dueDate ?? undefined,
    date: invoiceDate ?? undefined,
    number: number ?? undefined,
    notes: notes ?? undefined,
    taxes: taxes ?? undefined,
    discount: discount ?? undefined,
    status: status ?? "Draft",
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoilessId: invoilessData.id,
      invoilessUrl: invoilessData.url ?? null,
      userId,
      number: invoilessData.number ?? number ?? null,
      status: invoilessData.status ?? status ?? "Draft",
      currency: currency ?? "USD",
      totalAmount: invoilessData.total ?? invoilessData.totalAmount ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      notes: notes ?? null,
      lastSyncedAt: new Date(),
    },
  });

  try {
    const portalUrl = `${process.env.NEXTAUTH_URL || ""}/invoices`;
    await sendInvoiceEmail(
      clientUser.email,
      clientUser.name,
      invoice.number,
      invoice.totalAmount,
      invoice.currency,
      invoice.dueDate,
      invoice.invoilessUrl,
      portalUrl
    );
  } catch (err) {
    console.error("Email notification failed:", err);
  }

  return NextResponse.json(invoice, { status: 201 });
}
