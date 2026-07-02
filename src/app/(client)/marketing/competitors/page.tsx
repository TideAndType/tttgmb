"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Sparkles, RefreshCw, Trash2, Plus, ExternalLink, TrendingUp, ShieldAlert, Lightbulb } from "lucide-react";

interface Insight { id: string; summary: string; strengths: string[]; gaps: string[]; recommendations: string[]; createdAt: string; }
interface Competitor { id: string; name: string; website: string | null; notes: string | null; insights: Insight[]; }

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [adding, setAdding] = useState(false);
  const [analyzing, setAnalyzing] = useState<string>("");
  const [error, setError] = useState("");

  const load = async () => {
    const d = await fetch("/api/marketing/competitors").then((r) => r.json());
    setItems(d.competitors ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    setError("");
    const r = await fetch("/api/marketing/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, website }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Couldn't add competitor."); return; }
    setItems((prev) => [d.competitor, ...prev]);
    setName(""); setWebsite(""); setAdding(false);
  };

  const analyze = async (id: string) => {
    setAnalyzing(id); setError("");
    const r = await fetch(`/api/marketing/competitors/${id}/analyze`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't analyze.");
    else setItems((prev) => prev.map((c) => c.id === id ? { ...c, insights: [d.insight, ...c.insights] } : c));
    setAnalyzing("");
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/marketing/competitors/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Competitor Intelligence</h1>
            <p className="text-sm text-muted-foreground">Track competitors and get AI assessments: what they do well, where you can win.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4 mr-1.5" /> Add competitor</Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      {adding && (
        <Card><CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor name" className="max-w-xs" />
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://… (optional)" className="flex-1 min-w-[200px]" />
          <Button onClick={add} disabled={!name.trim()}>Add</Button>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Swords className="h-8 w-8 mx-auto mb-2 opacity-40" />No competitors yet. Add one to get an AI assessment.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const insight = c.insights[0];
            return (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      {c.name}
                      {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    </CardTitle>
                    {insight && <p className="text-xs text-muted-foreground mt-0.5">Analyzed {new Date(insight.createdAt).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => analyze(c.id)} disabled={analyzing === c.id}>
                      {analyzing === c.id ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {insight ? "Re-analyze" : "Analyze"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                {insight && (
                  <CardContent className="space-y-3">
                    <p className="text-sm text-foreground/90">{insight.summary}</p>
                    <div className="grid md:grid-cols-3 gap-3">
                      <InsightBlock icon={TrendingUp} title="Their strengths" items={insight.strengths} className="text-amber-500" />
                      <InsightBlock icon={ShieldAlert} title="Where you can win" items={insight.gaps} className="text-green-500" />
                      <InsightBlock icon={Lightbulb} title="What to do" items={insight.recommendations} className="text-primary" />
                    </div>
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

function InsightBlock({ icon: Icon, title, items, className }: { icon: React.ElementType; title: string; items: string[]; className: string }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${className}`}><Icon className="h-3.5 w-3.5" /> {title}</p>
      <ul className="space-y-1">{items.map((it, i) => <li key={i} className="text-sm text-foreground/80 flex gap-1.5"><span className="text-muted-foreground">•</span>{it}</li>)}</ul>
    </div>
  );
}
