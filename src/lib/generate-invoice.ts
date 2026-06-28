import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/invoiless";
import { sendInvoiceEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export interface InvoiceLineItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
}

export interface GenerateInvoiceInput {
  userId: string;
  items: InvoiceLineItem[];
  currency?: string;
  dueDate?: string | null;
  invoiceDate?: string | null;
  number?: string;
  notes?: string | null;
  taxes?: { name: string; value: number; type?: string }[];
  discount?: { type?: string; value: number };
  status?: string;
}

/**
 * Creates an invoice in Invoiless, persists it locally, notifies the client,
 * and emails them (if they haven't opted out). Shared by the manual create
 * route and the recurring-invoice cron.
 */
export async function generateInvoice(input: GenerateInvoiceInput) {
  const clientUser = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!clientUser) throw new Error("Client not found");

  const invoilessData = await createInvoice({
    customer: {
      internalId: input.userId,
      billTo: { company: clientUser.companyName ?? undefined, email: clientUser.email },
    },
    items: input.items,
    currency: input.currency ?? "USD",
    dueDate: input.dueDate ?? undefined,
    date: input.invoiceDate ?? undefined,
    number: input.number ?? undefined,
    notes: input.notes ?? undefined,
    taxes: input.taxes ?? undefined,
    discount: input.discount ?? undefined,
    status: input.status ?? "Draft",
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoilessId: invoilessData.id,
      invoilessUrl: invoilessData.url ?? null,
      userId: input.userId,
      number: invoilessData.number ?? input.number ?? null,
      status: invoilessData.status ?? input.status ?? "Draft",
      currency: input.currency ?? "USD",
      totalAmount: invoilessData.total ?? invoilessData.totalAmount ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
      notes: input.notes ?? null,
      lastSyncedAt: new Date(),
    },
  });

  createNotification(
    input.userId,
    "invoice_sent",
    "New invoice issued",
    invoice.number ? `Invoice #${invoice.number}` : "A new invoice has been issued",
    "/invoices"
  );

  try {
    if (clientUser.notifyInvoiceSent) {
      const portalUrl = `${process.env.NEXTAUTH_URL || ""}/invoices`;
      await sendInvoiceEmail(
        clientUser.email, clientUser.name, invoice.number, invoice.totalAmount,
        invoice.currency, invoice.dueDate, invoice.invoilessUrl, portalUrl
      );
    }
  } catch (err) {
    console.error("Email notification failed:", err);
  }

  return invoice;
}

export function advanceInvoiceDate(from: Date, interval: string): Date {
  const next = new Date(from);
  if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else if (interval === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
}
