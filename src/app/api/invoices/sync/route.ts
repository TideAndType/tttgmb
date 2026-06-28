import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listInvoices } from "@/lib/invoiless";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all invoices from Invoiless (paginate if needed)
  let page = 1;
  const limit = 50;
  let allInvoices: any[] = [];

  while (true) {
    const result = await listInvoices(page, limit);
    const items: any[] = result.data ?? result.invoices ?? result ?? [];
    if (!Array.isArray(items) || items.length === 0) break;
    allInvoices = allInvoices.concat(items);
    if (items.length < limit) break;
    page++
  }

  let synced = 0;
  let updated = 0;

  for (const inv of allInvoices) {
    synced++
    const existing = await prisma.invoice.findUnique({ where: { invoilessId: inv.id } });
    if (!existing) continue;

    const newStatus = inv.status ?? existing.status;
    const newTotal = inv.total ?? inv.totalAmount ?? existing.totalAmount;
    const newDueDate = inv.dueDate ? new Date(inv.dueDate) : existing.dueDate;
    const newUrl = inv.url ?? existing.invoilessUrl;

    if (
      newStatus !== existing.status ||
      newTotal !== existing.totalAmount ||
      newUrl !== existing.invoilessUrl
    ) {
      await prisma.invoice.update({
        where: { invoilessId: inv.id },
        data: {
          status: newStatus,
          totalAmount: newTotal,
          dueDate: newDueDate,
          invoilessUrl: newUrl,
          lastSyncedAt: new Date(),
        },
      });
      updated++
    }
  }

  return NextResponse.json({ synced, updated });
}
