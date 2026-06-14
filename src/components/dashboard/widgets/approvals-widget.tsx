"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export function ApprovalsWidget() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/approvals").then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const pending = items.filter(i => i.status === "PENDING");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> : (
          <>
            <p className="text-3xl font-bold text-foreground mb-1">{pending.length}</p>
            <p className="text-sm text-muted-foreground mb-3">pending approval{pending.length !== 1 ? "s" : ""}</p>
            <div className="space-y-1.5">
              {pending.slice(0, 3).map((a: any) => (
                <div key={a.id} className="text-sm text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="truncate">{a.title}</span>
                </div>
              ))}
            </div>
            <Link href="/approvals" className="text-xs text-primary hover:underline block pt-2">View all →</Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
