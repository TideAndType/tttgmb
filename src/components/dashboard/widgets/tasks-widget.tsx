"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Loader2 } from "lucide-react";
import Link from "next/link";

export function TasksWidget() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const open = tasks.filter(t => t.status !== "COMPLETED");
  const done = tasks.filter(t => t.status === "COMPLETED");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" /> Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> : (
          <>
            <div className="flex gap-4 mb-3">
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{open.length}</p><p className="text-xs text-muted-foreground">Open</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{done.length}</p><p className="text-xs text-muted-foreground">Done</p></div>
            </div>
            <div className="space-y-1.5">
              {open.slice(0, 3).map((t: any) => (
                <div key={t.id} className="text-sm text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
            <Link href="/tasks" className="text-xs text-primary hover:underline block pt-2">View all tasks →</Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
