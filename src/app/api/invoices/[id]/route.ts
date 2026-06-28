import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInvoice, updateInvoice, sendInvoice, deleteInvoice } from "@/lib/invoiless";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, companyName: true, email: true } } },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "CLIENT" && invoice.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch fresh data from Invoiless and sync
  try {
    const fresh = await getInvoice(invoice.invoilessId);
    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: fresh.status ?? invoice.status,
        totalAmount: fresh.total ?? fresh.totalAmount ?? invoice.totalAmount,
        invoilessUrl: fresh.url ?? invoice.invoilessUrl,
        lastSyncedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, companyName: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (_) {
    // If Invoiless is unreachable, return what we have
    return NextResponse.json(invoice);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.action === "send") {
    const { email, subject, body: msgBody } = body;
    await sendInvoice(invoice.invoilessId, { email, subject, body: msgBody });
    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { sentAt: new Date(), status: "Pending" },
    });
    return NextResponse.json(updated);
  }

  // General update
  const { items, currency, dueDate, invoiceDate, number, notes, taxes, discount, status } = body;
  const updateData: Record<string, unknown> = {};

  await updateInvoice(invoice.invoilessId, {
    items,
    currency,
    dueDate,
    date: invoiceDate,
    number,
    notes,
    taxes,
    discount,
    status,
  });

  if (status !== undefined) updateData.status = status;
  if (currency !== undefined) updateData.currency = currency;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (invoiceDate !== undefined) updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null;
  if (number !== undefined) updateData.number = number;
  if (notes !== undefined) updateData.notes = notes;
  updateData.lastSyncedAt = new Date();

  const updated = await prisma.invoice.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteInvoice(invoice.invoilessId);
  } catch (_) {
    // If already gone from Invoiless, still delete locally
  }

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
