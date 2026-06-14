"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";

export function ActivityWidget() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity?limit=6").then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d.slice(0,6) : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> :
          items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p> : (
            <div className="space-y-2">
              {items.map((a: any) => (
                <div key={a.id} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="text-foreground">{a.description ?? a.action}</span>
                    <span className="text-muted-foreground text-xs block">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
