"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, RefreshCw, Target, TrendingUp, AlertTriangle, Trophy, Lightbulb,
  ArrowUpRight, CheckCircle2, Gauge,
} from "lucide-react";

interface ScoreSnap {
  overall: number; seo: number; local: number; social: number; reputation: number;
  website: number; aiVisibility: number; leadGen: number; createdAt: string;
}
interface Briefing { summary: string; focus: string[]; opportunities: string[]; risks: string[]; wins: string[]; }
interface MTask { id: string; title: string; category: string; priority: string; impact: string; estMinutes: number; status: string; }

const SUB_SCORES: { key: keyof ScoreSnap; label: string }[] = [
  { key: "seo", label: "SEO" },
  { key: "local", label: "Local" },
  { key: "social", label: "Social" },
  { key: "reputation", label: "Reputation" },
  { key: "website", label: "Website" },
  { key: "aiVisibility", label: "AI Visibility" },
  { key: "leadGen", label: "Lead Gen" },
];

function scoreColor(n: number) {
  if (n >= 75) return "text-green-600";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}
function ringColor(n: number) {
  if (n >= 75) return "hsl(142 71% 45%)";
  if (n >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}

function ScoreRing({ value, size = 128 }: { value: number; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor(value)} strokeWidth={10} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="rotate-90 fill-foreground font-bold" style={{ fontSize: size * 0.26, transformOrigin: "center" }}>{value}</text>
    </svg>
  );
}

export default function MarketingWorkspace() {
  const [scores, setScores] = useState<ScoreSnap | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [tasks, setTasks] = useState<MTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [s, b, t] = await Promise.all([
      fetch("/api/marketing/scores").then((r) => r.json()),
      fetch("/api/marketing/briefing").then((r) => r.json()),
      fetch("/api/marketing/tasks").then((r) => r.json()),
    ]);
    let latest = s.latest;
    if (!latest) {
      const r = await fetch("/api/marketing/scores", { method: "POST" }).then((r) => r.json());
      latest = r.latest;
    }
    setScores(latest);
    setBriefing(b.briefing ?? null);
    setTasks(Array.isArray(t.tasks) ? t.tasks : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshScores = async () => {
    setBusy("scores"); setError("");
    const r = await fetch("/api/marketing/scores", { method: "POST" }).then((r) => r.json());
    if (r.latest) setScores(r.latest);
    setBusy("");
  };

  const generateBriefing = async () => {
    setBusy("briefing"); setError("");
    const r = await fetch("/api/marketing/briefing", { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate briefing.");
    else setBriefing(d.briefing);
    setBusy("");
  };

  const generateTasks = async () => {
    setBusy("tasks"); setError("");
    const r = await fetch("/api/marketing/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generate: true }) });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate tasks.");
    else { const t = await fetch("/api/marketing/tasks").then((r) => r.json()); setTasks(t.tasks ?? []); }
    setBusy("");
  };

  const completeTask = async (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "done" } : t));
    await fetch(`/api/marketing/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) });
  };

  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress");
  const priorityTasks = [...openTasks].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  }).slice(0, 5);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketing OS</h1>
            <p className="text-sm text-muted-foreground">Your AI marketing employee — what to do next to grow.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing/setup"><Button variant="outline" size="sm">Business profile</Button></Link>
          <Button size="sm" variant="outline" onClick={refreshScores} disabled={busy === "scores"}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${busy === "scores" ? "animate-spin" : ""}`} /> Refresh scores
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      {/* Scores */}
      <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-center">
        <Card className="justify-self-center">
          <CardContent className="flex flex-col items-center gap-2 py-6 px-10">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"><Gauge className="h-3.5 w-3.5" /> Marketing Health</div>
            <ScoreRing value={scores?.overall ?? 0} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUB_SCORES.map((s) => {
            const v = (scores?.[s.key] as number) ?? 0;
            return (
              <div key={s.key} className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${scoreColor(v)}`}>{v}</p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: ringColor(v) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily briefing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Today&apos;s AI Briefing</CardTitle>
          <Button size="sm" variant="outline" onClick={generateBriefing} disabled={busy === "briefing"}>
            {busy === "briefing" ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {briefing ? "Regenerate" : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {!briefing ? (
            <p className="text-sm text-muted-foreground">No briefing yet today. Generate one to get your focus, opportunities, and risks.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-foreground/90 leading-relaxed">{briefing.summary}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <BriefBlock icon={Target} title="Today's focus" items={briefing.focus} className="text-primary" />
                <BriefBlock icon={Lightbulb} title="Opportunities" items={briefing.opportunities} className="text-amber-500" />
                <BriefBlock icon={AlertTriangle} title="Risks" items={briefing.risks} className="text-red-500" />
                <BriefBlock icon={Trophy} title="Wins" items={briefing.wins} className="text-green-500" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Today&apos;s Priority Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={generateTasks} disabled={busy === "tasks"}>
              {busy === "tasks" ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Generate tasks
            </Button>
            <Link href="/marketing/tasks"><Button size="sm" variant="ghost">View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {priorityTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. Click <strong>Generate tasks</strong> to get AI recommendations.</p>
          ) : priorityTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <button onClick={() => completeTask(t.id)} className="text-muted-foreground hover:text-green-600 shrink-0" title="Mark done">
                <CheckCircle2 className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{t.category} · ~{t.estMinutes}m · {t.impact} impact</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${t.priority === "high" ? "bg-red-500/10 text-red-600" : t.priority === "low" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>{t.priority}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/marketing/assistant"><Card className="hover:border-primary/50 transition-colors h-full"><CardContent className="p-4"><Sparkles className="h-5 w-5 text-primary mb-2" /><p className="font-medium text-foreground">AI Assistant</p><p className="text-xs text-muted-foreground">Ask anything about your marketing</p></CardContent></Card></Link>
        <Link href="/marketing/content"><Card className="hover:border-primary/50 transition-colors h-full"><CardContent className="p-4"><Lightbulb className="h-5 w-5 text-primary mb-2" /><p className="font-medium text-foreground">Content Studio</p><p className="text-xs text-muted-foreground">Generate posts, blogs & emails</p></CardContent></Card></Link>
        <Link href="/marketing/tasks"><Card className="hover:border-primary/50 transition-colors h-full"><CardContent className="p-4"><TrendingUp className="h-5 w-5 text-primary mb-2" /><p className="font-medium text-foreground">Task Engine</p><p className="text-xs text-muted-foreground">Your prioritized growth to-dos</p></CardContent></Card></Link>
      </div>
    </div>
  );
}

function BriefBlock({ icon: Icon, title, items, className }: { icon: React.ElementType; title: string; items: string[]; className: string }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${className}`}><Icon className="h-3.5 w-3.5" /> {title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => <li key={i} className="text-sm text-foreground/90 flex gap-2"><span className="text-muted-foreground">•</span>{it}</li>)}
      </ul>
    </div>
  );
}
