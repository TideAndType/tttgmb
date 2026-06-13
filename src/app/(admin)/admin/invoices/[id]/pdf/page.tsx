"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function PrintButton({ backHref }: { backHref: string }) {
  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print fixed bottom-6 right-6 z-50 flex gap-2">
        <a href={backHref} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">← Back</a>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-lg">⬇ Download PDF</button>
      </div>
    </>
  );
}

interface Invoice {
  id: string;
  invoilessId: string;
  number: string | null;
  status: string;
  currency: string;
  totalAmount: number | null;
  dueDate: string | null;
  invoiceDate: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string; companyName: string | null; email: string };
}

function fmt(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Unpaid: "bg-amber-100 text-amber-700",
  Pending: "bg-blue-100 text-blue-700",
  Draft: "bg-gray-100 text-gray-700",
  Canceled: "bg-gray-100 text-gray-500",
};

export default function InvoicePdfPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then(r => r.json())
      .then(data => { setInvoice(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Loading…</div>;
  if (!invoice) return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Invoice not found.</div>;

  const clientName = invoice.user.companyName || invoice.user.name;
  const invoiceLabel = invoice.number ? `Invoice #${invoice.number}` : `Invoice ${invoice.invoilessId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <PrintButton backHref={`/admin/invoices`} />
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0 print:rounded-none print:max-w-full">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
              <p className="text-gray-500 mt-1">{invoiceLabel}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-700"}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Bill to + Details */}
        <div className="px-10 py-6 grid grid-cols-2 gap-8 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-gray-900">{clientName}</p>
            {invoice.user.companyName && <p className="text-gray-600 text-sm">{invoice.user.name}</p>}
            <p className="text-gray-500 text-sm">{invoice.user.email}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Date</span>
              <span className="text-gray-900 font-medium">{fmtDate(invoice.invoiceDate ?? invoice.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date</span>
              <span className={`font-medium ${invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "Paid" ? "text-red-600" : "text-gray-900"}`}>{fmtDate(invoice.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice #</span>
              <span className="text-gray-900 font-medium">{invoice.number ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="px-10 py-6 border-b border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-700">Description</th>
              <th className="text-right py-2 font-semibold text-gray-700">Amount</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 text-gray-900">Professional Services</td>
                <td className="py-3 text-right text-gray-900">{fmt(invoice.totalAmount, invoice.currency)}</td>
              </tr>
            </tbody>
            <tfoot><tr className="border-t-2 border-gray-900">
              <td className="py-3 font-bold text-gray-900">Total Due</td>
              <td className="py-3 text-right font-bold text-gray-900 text-lg">{fmt(invoice.totalAmount, invoice.currency)}</td>
            </tr></tfoot>
          </table>
        </div>

        {/* Notes + footer */}
        {invoice.notes && (
          <div className="px-10 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
        <div className="px-10 py-6 text-center text-gray-400 text-sm">
          Thank you for your business.
        </div>
      </div>
    </div>
  );
}
