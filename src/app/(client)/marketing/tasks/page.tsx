"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, CheckCircle2, Circle, X, ChevronDown, ChevronRight, Target } from "lucide-react";

interface MTask {
  id: string; title: string; category: string; priority: string; impact: string;
  estMinutes: number; instructions: string | null; status: string;
}

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-blue-500/10 text-blue-600",
};

export default function MarketingTasksPage() {
  const [tasks, setTasks] = useState<MTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");

  const load = async () => {
    const d = await fetch("/api/marketing/tasks").then((r) => r.json());
    setTasks(d.tasks ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true); setError("");
    const r = await fetch("/api/marketing/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generate: true }) });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate tasks.");
    else load();
    setBusy(false);
  };

  const setStatus = async (id: string, status: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    await fetch(`/api/marketing/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  };

  const visible = tasks.filter((t) => filter === "all" ? t.status !== "dismissed" : filter === "done" ? t.status === "done" : (t.status === "open" || t.status === "in_progress"));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Task Engine</h1>
            <p className="text-sm text-muted-foreground">Prioritized, high-impact actions to grow your business.</p>
          </div>
        </div>
        <Button size="sm" onClick={generate} disabled={busy}>
          {busy ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Generate tasks
        </Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        {["open", "done", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-sm border capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No tasks here. Click <strong>Generate tasks</strong> for AI recommendations.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visible.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => setStatus(t.id, t.status === "done" ? "open" : "done")} className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-600">
                    {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${priorityBadge[t.priority] || ""}`}>{t.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.category} · ~{t.estMinutes}m · {t.impact} impact</p>
                    {t.instructions && (
                      <>
                        <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1">
                          {expanded === t.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} How to do this
                        </button>
                        {expanded === t.id && <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap border-l-2 border-border pl-3">{t.instructions}</p>}
                      </>
                    )}
                  </div>
                  <button onClick={() => setStatus(t.id, "dismissed")} className="text-muted-foreground hover:text-destructive shrink-0" title="Dismiss"><X className="h-4 w-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
