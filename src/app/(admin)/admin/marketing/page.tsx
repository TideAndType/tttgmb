"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Sparkles, ArrowUpRight, CheckCircle2, X, FileText, Gauge } from "lucide-react";

interface Row {
  id: string; name: string; companyName: string | null; image: string | null;
  score: null | { overall: number; seo: number; local: number; social: number; reputation: number; website: number; aiVisibility: number; leadGen: number; at: string };
  openTasks: number; draftContent: number;
}
interface DraftContent {
  id: string; type: string; title: string; body: string; createdAt: string;
  user: { name: string; companyName: string | null };
}

function scoreColor(n: number) {
  if (n >= 75) return "text-green-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function AdminMarketingConsole() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<DraftContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clients" | "approvals">("clients");
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    const [o, c] = await Promise.all([
      fetch("/api/admin/marketing/overview").then((r) => r.json()),
      fetch("/api/admin/marketing/content").then((r) => r.json()),
    ]);
    setRows(o.clients ?? []);
    setDrafts(c.content ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openWorkspace = async (clientId: string) => {
    await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
    router.push("/marketing");
  };

  const setContentStatus = async (id: string, status: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await fetch("/api/admin/marketing/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
  };

  const sorted = [...rows].sort((a, b) => (a.score?.overall ?? -1) - (b.score?.overall ?? -1));
  const avg = rows.filter((r) => r.score).length
    ? Math.round(rows.filter((r) => r.score).reduce((a, r) => a + (r.score?.overall ?? 0), 0) / rows.filter((r) => r.score).length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing OS — Agency Console</h1>
          <p className="text-sm text-muted-foreground">Every client&apos;s marketing health and content approvals in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Clients" value={rows.length} />
        <StatCard label="Avg health" value={avg} colored />
        <StatCard label="Open tasks" value={rows.reduce((a, r) => a + r.openTasks, 0)} />
        <StatCard label="Awaiting approval" value={drafts.length} />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("clients")} className={`px-3 py-1.5 rounded-full text-sm border ${tab === "clients" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>Client health</button>
        <button onClick={() => setTab("approvals")} className={`px-3 py-1.5 rounded-full text-sm border ${tab === "approvals" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>Content approvals {drafts.length > 0 && `(${drafts.length})`}</button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : tab === "clients" ? (
        <div className="space-y-2">
          {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No clients yet.</p> : sorted.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <UserAvatar name={r.name} seed={r.id} image={r.image} className="h-9 w-9 text-xs shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.companyName || r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.openTasks} open tasks · {r.draftContent} drafts{r.score ? "" : " · no score yet"}</p>
                </div>
                {r.score && (
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    {(["seo", "local", "social", "reputation", "website", "leadGen"] as const).map((k) => (
                      <div key={k} className="text-center w-10">
                        <p className={`text-sm font-semibold ${scoreColor(r.score![k])}`}>{r.score![k]}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{k === "leadGen" ? "lead" : k.slice(0, 4)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-center">
                    <p className={`text-xl font-bold ${r.score ? scoreColor(r.score.overall) : "text-muted-foreground"}`}>{r.score?.overall ?? "—"}</p>
                    <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-0.5"><Gauge className="h-2.5 w-2.5" /> health</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openWorkspace(r.id)}>Open <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No content awaiting approval.</CardContent></Card>
          ) : drafts.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{d.type}</span>
                    <span className="text-xs text-muted-foreground">{d.user.companyName || d.user.name}</span>
                  </div>
                  <CardTitle className="text-base mt-1 truncate">{d.title}</CardTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>{expanded === d.id ? "Hide" : "Preview"}</Button>
                  <Button size="sm" onClick={() => setContentStatus(d.id, "approved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setContentStatus(d.id, "draft")} title="Dismiss from queue"><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              {expanded === d.id && (
                <CardContent>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-80 overflow-y-auto"><RichTextContent text={d.body} /></div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, colored }: { label: string; value: number; colored?: boolean }) {
  const cls = colored ? (value >= 75 ? "text-green-600" : value >= 50 ? "text-amber-600" : "text-red-600") : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}
