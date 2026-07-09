"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Workflow, Plus, Trash2, Play, Zap } from "lucide-react";

interface Automation {
  id: string; name: string; trigger: string; action: string;
  config: Record<string, string> | null; enabled: boolean; lastRunAt: string | null; runCount: number;
}

const TRIGGERS = [
  { value: "content_published", label: "When content is published" },
  { value: "review_received", label: "When a review is received" },
  { value: "score_drop", label: "When marketing health drops" },
  { value: "manual", label: "Manual / on demand" },
];
const ACTIONS = [
  { value: "create_task", label: "Create a marketing task" },
  { value: "notify", label: "Send an in-app notification" },
  { value: "generate_social", label: "Generate social posts from it" },
  { value: "draft_review_response", label: "Draft an AI review response" },
];

const RECIPES: { name: string; trigger: string; action: string; config?: Record<string, string> }[] = [
  { name: "Promote new blog on social", trigger: "content_published", action: "generate_social" },
  { name: "Reply to new reviews automatically", trigger: "review_received", action: "draft_review_response" },
  { name: "Investigate marketing health drops", trigger: "score_drop", action: "create_task", config: { taskTitle: "Investigate marketing health drop", category: "seo", priority: "high" } },
  { name: "Alert me on new reviews", trigger: "review_received", action: "notify", config: { message: "You received a new review — check Reputation." } },
];

const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

export default function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "content_published", action: "generate_social", taskTitle: "", message: "" });
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const load = async () => {
    const d = await fetch("/api/marketing/automations").then((r) => r.json());
    setItems(d.automations ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (payload: { name: string; trigger: string; action: string; config?: Record<string, string> }) => {
    setError("");
    const r = await fetch("/api/marketing/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Couldn't create automation."); return; }
    setItems((prev) => [d.automation, ...prev]);
  };

  const createFromForm = async () => {
    if (!form.name.trim()) return;
    const config: Record<string, string> = {};
    if (form.action === "create_task" && form.taskTitle) config.taskTitle = form.taskTitle;
    if (form.action === "notify" && form.message) config.message = form.message;
    await create({ name: form.name, trigger: form.trigger, action: form.action, config });
    setForm({ name: "", trigger: "content_published", action: "generate_social", taskTitle: "", message: "" });
    setAdding(false);
  };

  const toggle = async (a: Automation) => {
    setItems((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !x.enabled } : x));
    await fetch(`/api/marketing/automations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !a.enabled }) });
  };
  const remove = async (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/marketing/automations/${id}`, { method: "DELETE" });
  };
  const run = async (a: Automation) => {
    setFlash("");
    await fetch(`/api/marketing/automations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: true }) });
    setFlash(`Ran "${a.name}" ✓`);
    load();
    setTimeout(() => setFlash(""), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Workflow className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automations</h1>
            <p className="text-sm text-muted-foreground">When something happens, let the AI take action automatically.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4 mr-1.5" /> New automation</Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
      {flash && <div className="rounded-md bg-green-500/10 text-green-600 text-sm px-3 py-2">{flash}</div>}

      {/* Quick recipes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick recipes</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {RECIPES.map((r) => (
            <button key={r.name} onClick={() => create(r)} className="text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-accent transition-colors">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> {r.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label(TRIGGERS, r.trigger)} → {label(ACTIONS, r.action)}</p>
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <Card><CardHeader><CardTitle className="text-base">New automation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Automation name" />
            <div className="grid sm:grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">When…</label>
                <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
                  {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">…do this</label>
                <select value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
                  {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {form.action === "create_task" && <Input value={form.taskTitle} onChange={(e) => setForm((f) => ({ ...f, taskTitle: e.target.value }))} placeholder="Task title" />}
            {form.action === "notify" && <Input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Notification message" />}
            <Button onClick={createFromForm} disabled={!form.name.trim()}>Create automation</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No automations yet. Pick a recipe above to get started.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <button onClick={() => toggle(a)} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${a.enabled ? "bg-primary" : "bg-muted"}`} title={a.enabled ? "Enabled" : "Disabled"}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${a.enabled ? "left-4" : "left-0.5"}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{label(TRIGGERS, a.trigger)} → {label(ACTIONS, a.action)}{a.runCount > 0 ? ` · ran ${a.runCount}×` : ""}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => run(a)} title="Run now"><Play className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
