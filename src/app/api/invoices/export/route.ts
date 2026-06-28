import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    include: { user: { select: { name: true, companyName: true } } },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
  });

  const headers = [
    "Number", "Client", "Status", "Currency", "Total", "Invoice Date",
    "Due Date", "Sent", "Created",
  ];

  const rows = invoices.map((inv) => [
    inv.number || "",
    inv.user?.companyName || inv.user?.name || "",
    inv.status,
    inv.currency,
    inv.totalAmount ?? "",
    fmtDate(inv.invoiceDate),
    fmtDate(inv.dueDate),
    fmtDate(inv.sentAt),
    fmtDate(inv.createdAt),
  ]);

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, { headers: csvHeaders(`invoices-${date}.csv`) });
}
