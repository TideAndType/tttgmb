"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
}

interface LineItem {
  name: string;
  description: string;
  quantity: number;
  price: number;
}

const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD"];
const STATUSES = ["Draft", "Pending", "Unpaid"];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [userId, setUserId] = useState("");
  const [number, setNumber] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Draft");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("");

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { name: "", description: "", quantity: 1, price: 0 },
  ]);

  // Tax
  const [taxName, setTaxName] = useState("");
  const [taxValue, setTaxValue] = useState("");

  // Discount
  const [discountType, setDiscountType] = useState("Flat");
  const [discountValue, setDiscountValue] = useState("");

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function addItem() {
    setItems((prev) => [...prev, { name: "", description: "", quantity: 1, price: 0 }]);
  }

  const [loadingTime, setLoadingTime] = useState(false);
  const [billTime, setBillTime] = useState(false);
  async function addLoggedTime() {
    if (!userId) { setError("Select a client first."); return; }
    setLoadingTime(true);
    setError(null);
    try {
      const res = await fetch(`/api/time/billable?clientId=${userId}`);
      const data = await res.json();
      const hours = data.hours ?? 0;
      if (!hours) { setError("No logged time found for this client."); return; }
      const rateStr = window.prompt(`This client has ${hours}h logged. Hourly rate?`, "150");
      if (rateStr === null) return;
      const rate = parseFloat(rateStr) || 0;
      setItems((prev) => [...prev, { name: "Time tracked", description: `${hours} hours`, quantity: hours, price: rate }]);
      setBillTime(true);
    } finally {
      setLoadingTime(false);
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const taxAmount =
    taxValue && !isNaN(Number(taxValue)) ? (subtotal * Number(taxValue)) / 100 : 0;

  let discountAmount = 0;
  if (discountValue && !isNaN(Number(discountValue))) {
    discountAmount =
      discountType === "Percentage"
        ? (subtotal * Number(discountValue)) / 100
        : Number(discountValue);
  }

  const total = subtotal + taxAmount - discountAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Please select a client.");
      return;
    }
    if (items.some((i) => !i.name)) {
      setError("All line items need a name.");
      return;
    }

    const payload: Record<string, unknown> = {
      userId,
      currency,
      status,
      items: items.map((i) => ({
        name: i.name,
        description: i.description || undefined,
        quantity: i.quantity,
        price: i.price,
      })),
      number: number || undefined,
      invoiceDate: invoiceDate || undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      recurrence: recurrence || undefined,
      billTime: billTime || undefined,
    };

    if (taxValue && taxName) {
      payload.taxes = [{ name: taxName, value: Number(taxValue), type: "Percentage" }];
    }

    if (discountValue) {
      payload.discount = { type: discountType, value: Number(discountValue) };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }
      router.push("/admin/invoices");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
        <p className="text-muted-foreground text-sm mt-1">Create and send an invoice via Invoiless</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Client <span className="text-destructive">*</span>
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.name})` : c.name} — {c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Invoice Number
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. INV-001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Repeat</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Does not repeat</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
              {recurrence && (
                <p className="text-xs text-muted-foreground mt-1">
                  This invoice is created now; a new one is generated automatically each {recurrence === "weekly" ? "week" : recurrence === "monthly" ? "month" : "quarter"}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Line Items</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addLoggedTime} disabled={loadingTime}>
                <Clock className="h-4 w-4 mr-1.5" />
                {loadingTime ? "Loading..." : "Add logged time"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    placeholder="Item name"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium text-foreground">
                  {formatCurrency(item.quantity * item.price, currency)}
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tax & Discount */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax &amp; Discount (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tax Name</label>
              <input
                type="text"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                placeholder="e.g. VAT"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tax % Rate</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxValue}
                onChange={(e) => setTaxValue(e.target.value)}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Flat">Flat</option>
                <option value="Percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Discount Value {discountType === "Percentage" ? "(%)" : `(${currency})`}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes or payment instructions…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{taxName || "Tax"} ({taxValue}%)</span>
                  <span>+{formatCurrency(taxAmount, currency)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>−{formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-foreground text-base border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/invoices">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
