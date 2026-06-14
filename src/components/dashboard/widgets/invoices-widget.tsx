"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Loader2 } from "lucide-react";
import Link from "next/link";

export function InvoicesWidget() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const paid = invoices.filter(i => i.status === "Paid").length;
  const unpaid = invoices.filter(i => i.status !== "Paid").length;
  const outstanding = invoices.filter(i => ["Unpaid","Pending","Partial"].includes(i.status)).reduce((s, i) => s + (i.totalAmount ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> : (
          <>
            <div className="flex gap-4 mb-3">
              <div className="text-center"><p className="text-2xl font-bold text-green-600">{paid}</p><p className="text-xs text-muted-foreground">Paid</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-amber-600">{unpaid}</p><p className="text-xs text-muted-foreground">Unpaid</p></div>
            </div>
            {outstanding > 0 && <p className="text-sm text-muted-foreground mb-2">Outstanding: <span className="font-semibold text-foreground">${outstanding.toLocaleString()}</span></p>}
            <Link href="/invoices" className="text-xs text-primary hover:underline">View all invoices →</Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
