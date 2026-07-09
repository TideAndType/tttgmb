"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Sparkles, RefreshCw, Trash2, TrendingUp, TrendingDown, Target, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";

interface Sections {
  improved: string[]; declined: string[]; whyItMatters: string; impact: string;
  nextSteps: string[]; priorities: string[]; scores?: Record<string, number>;
}
interface Report { id: string; title: string; summary: string; sections: Sections | null; createdAt: string; }

export default function MarketingReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const d = await fetch("/api/marketing/reports").then((r) => r.json());
    setReports(d.reports ?? []);
    if (d.reports?.[0]) setOpen(d.reports[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true); setError("");
    const r = await fetch("/api/marketing/reports", { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate report.");
    else { setReports((prev) => [d.report, ...prev]); setOpen(d.report.id); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/marketing/reports/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketing Reports</h1>
            <p className="text-sm text-muted-foreground">Plain-English reports: what changed, why it matters, and what&apos;s next.</p>
          </div>
        </div>
        <Button size="sm" onClick={generate} disabled={busy}>
          {busy ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Generate report
        </Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-40" />No reports yet. Generate your first plain-English marketing report.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const s = r.sections;
            const isOpen = open === r.id;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex items-center gap-2 text-left min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <CardTitle className="text-base truncate">{r.title}</CardTitle>
                  </button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4">
                    <p className="text-sm text-foreground/90 leading-relaxed">{r.summary}</p>
                    {s && (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Block icon={TrendingUp} title="What improved" items={s.improved} className="text-green-600" />
                          <Block icon={TrendingDown} title="What declined" items={s.declined} className="text-red-600" />
                        </div>
                        {s.whyItMatters && <Para title="Why it matters" body={s.whyItMatters} />}
                        {s.impact && <Para title="Business impact" body={s.impact} />}
                        <div className="grid md:grid-cols-2 gap-4">
                          <Block icon={Lightbulb} title="Recommended next steps" items={s.nextSteps} className="text-amber-500" />
                          <Block icon={Target} title="Upcoming priorities" items={s.priorities} className="text-primary" />
                        </div>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">Generated {new Date(r.createdAt).toLocaleString()}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Block({ icon: Icon, title, items, className }: { icon: React.ElementType; title: string; items: string[]; className: string }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${className}`}><Icon className="h-3.5 w-3.5" /> {title}</p>
      <ul className="space-y-1">{items.map((it, i) => <li key={i} className="text-sm text-foreground/85 flex gap-1.5"><span className="text-muted-foreground">•</span>{it}</li>)}</ul>
    </div>
  );
}
function Para({ title, body }: { title: string; body: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</p><p className="text-sm text-foreground/85 leading-relaxed">{body}</p></div>;
}
