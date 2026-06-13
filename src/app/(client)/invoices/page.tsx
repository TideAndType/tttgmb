"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt, AlertCircle, CreditCard } from "lucide-react";

interface Invoice {
  id: string;
  invoilessId: string;
  invoilessUrl: string | null;
  number: string | null;
  status: string;
  currency: string;
  totalAmount: number | null;
  dueDate: string | null;
  invoiceDate: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  Draft:     "bg-slate-500/20 text-slate-400",
  Pending:   "bg-blue-500/20 text-blue-400",
  Unpaid:    "bg-amber-500/20 text-amber-400",
  Partial:   "bg-orange-500/20 text-orange-400",
  Paid:      "bg-green-500/20 text-green-400",
  Canceled:  "bg-slate-500/20 text-slate-500",
  Refunded:  "bg-purple-500/20 text-purple-400",
};

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "Paid" || status === "Canceled" || status === "Refunded") return false;
  return new Date(dueDate) < new Date();
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [paying, setPaying] = useState<string | null>(null);
  const [paidNotice, setPaidNotice] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("paid") === "1") {
      setPaidNotice(true);
      const t = setTimeout(() => setPaidNotice(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  async function handlePay(id: string) {
    setPaying(id);
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setPaying(null);
    }
  }

  const visible = invoices.filter((inv) => inv.status !== "Draft").filter((inv) => {
    if (filter === "unpaid") return ["Unpaid", "Pending", "Partial"].includes(inv.status);
    if (filter === "paid") return inv.status === "Paid";
    return true;
  });

  const outstanding = invoices
    .filter((i) => ["Unpaid", "Pending", "Partial"].includes(i.status))
    .reduce((sum, i) => sum + (i.totalAmount ?? 0), 0);

  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const firstCurrency = invoices[0]?.currency ?? "USD";

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">View and manage your invoices.</p>
      </div>

      {paidNotice && (
        <div className="mb-6 flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          Payment successful! Your invoice has been paid.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(outstanding, firstCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Unpaid + partial invoices</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
          <p className="text-2xl font-bold text-green-400">{paidCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Invoices paid in total</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(["all", "unpaid", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-12 text-center">Loading invoices…</div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No invoices yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Your invoices will appear here once your account manager sends them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((inv) => {
            const overdue = isOverdue(inv.dueDate, inv.status);
            const canPay = ["Unpaid", "Pending"].includes(inv.status) && (inv.totalAmount ?? 0) > 0;
            return (
              <Card key={inv.id} className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {inv.number ? `Invoice #${inv.number}` : `Invoice ${inv.invoilessId.slice(0, 8)}`}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.Pending}`}>
                        {inv.status}
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>Issued {formatDate(inv.invoiceDate ?? inv.createdAt)}</span>
                      {inv.dueDate && (
                        <span className={overdue ? "text-red-400" : ""}>
                          Due {formatDate(inv.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(inv.totalAmount, inv.currency)}
                  </p>
                  {inv.invoilessUrl && (
                    <a
                      href={inv.invoilessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Invoice
                    </a>
                  )}
                  {canPay && (
                    <Button
                      size="sm"
                      onClick={() => handlePay(inv.id)}
                      disabled={paying === inv.id}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      {paying === inv.id ? "Redirecting…" : "Pay Now"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
