"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCw, ExternalLink, Send, Trash2 } from "lucide-react";

type Invoice = {
  id: string;
  invoilessId: string;
  invoilessUrl: string | null;
  number: string | null;
  status: string;
  currency: string;
  totalAmount: number | null;
  dueDate: string | null;
  createdAt: string;
  stripePaymentId: string | null;
  user: { id: string; name: string; companyName: string | null; email: string };
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Pending: "bg-blue-100 text-blue-700 border-blue-200",
  Unpaid: "bg-amber-100 text-amber-700 border-amber-200",
  Partial: "bg-orange-100 text-orange-700 border-orange-200",
  Paid: "bg-green-100 text-green-700 border-green-200",
  Canceled: "bg-slate-100 text-slate-700 border-slate-200",
  Refunded: "bg-purple-100 text-purple-700 border-purple-200",
};

const FILTERS = ["All", "Unpaid", "Paid", "Draft"] as const;
type Filter = (typeof FILTERS)[number];

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/invoices/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(`Synced ${data.synced} invoices, updated ${data.updated}`);
      await load();
    } catch {
      setSyncResult("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.number || inv.invoilessId}?`)) return;
    setDeletingId(inv.id);
    try {
      await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSend(inv: Invoice) {
    if (!confirm(`Send invoice to ${inv.user.email}?`)) return;
    setSendingId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      if (res.ok) {
        await load();
      }
    } finally {
      setSendingId(null);
    }
  }

  const filtered = invoices.filter((inv) => {
    if (filter === "All") return true;
    return inv.status === filter;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all client invoices via Invoiless</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Invoiless"}
          </Button>
          <Link href="/admin/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {syncResult && (
        <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-md">
          {syncResult}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-foreground">{inv.user.companyName || inv.user.name}</div>
                        <div className="text-muted-foreground text-xs">{inv.user.email}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground">{inv.number || "—"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                          {inv.stripePaymentId && (
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              Stripe
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatAmount(inv.totalAmount, inv.currency)}
                      </td>
                      <td className="p-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {inv.invoilessUrl && (
                            <a
                              href={inv.invoilessUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            onClick={() => handleSend(inv)}
                            disabled={sendingId === inv.id}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            {sendingId === inv.id ? "Sending…" : "Send"}
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={deletingId === inv.id}
                            className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deletingId === inv.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
