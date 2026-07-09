"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Workflow as WorkflowIcon, Plus, Trash2, ArrowUp, ArrowDown, Mail, MessageSquare, Clock, CheckSquare, Tag, Bell, KanbanSquare } from "lucide-react";

interface Step { type: string; config: Record<string, any>; }
interface Wf { id: string; name: string; trigger: string; triggerConfig: any; enabled: boolean; steps: Step[]; _count?: { enrollments: number }; }

const TRIGGERS = [
  { v: "contact_created", l: "A new contact is created" },
  { v: "form_submitted", l: "A form is submitted" },
  { v: "booking_created", l: "A booking is made" },
  { v: "manual", l: "Manually enrolled" },
];
const STEP_META: Record<string, { l: string; icon: any }> = {
  send_email: { l: "Send email", icon: Mail },
  send_sms: { l: "Send SMS", icon: MessageSquare },
  wait: { l: "Wait", icon: Clock },
  create_task: { l: "Create task", icon: CheckSquare },
  add_tag: { l: "Add tag", icon: Tag },
  notify: { l: "Notify me", icon: Bell },
};

export default function WorkflowsPage() {
  const [list, setList] = useState<Wf[]>([]);
  const [loading, setLoading] = useState(true);
  const [wf, setWf] = useState<Wf | null>(null);
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState(false);

  const load = async () => { const d = await fetch("/api/crm/workflows").then((r) => r.json()); setList(d.workflows ?? []); setLoading(false); };
  useEffect(() => { load(); fetch("/api/forms-builder").then((r) => r.json()).then((d) => setForms((d.forms ?? []).map((f: any) => ({ id: f.id, name: f.name })))).catch(() => {}); }, []);

  const create = async () => { const d = await fetch("/api/crm/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Workflow" }) }).then((r) => r.json()); open(d.workflow.id); };
  const open = async (id: string) => { const d = await fetch(`/api/crm/workflows/${id}`).then((r) => r.json()); setWf(d.workflow); };
  const set = (p: Partial<Wf>) => setWf((w) => w ? { ...w, ...p } : w);
  const setStep = (i: number, p: Partial<Step>) => setWf((w) => w ? { ...w, steps: w.steps.map((s, idx) => idx === i ? { ...s, ...p } : s) } : w);
  const setStepCfg = (i: number, key: string, val: any) => setWf((w) => w ? { ...w, steps: w.steps.map((s, idx) => idx === i ? { ...s, config: { ...s.config, [key]: val } } : s) } : w);
  const addStep = (type: string) => setWf((w) => w ? { ...w, steps: [...w.steps, { type, config: type === "wait" ? { minutes: 1440 } : {} }] } : w);
  const delStep = (i: number) => setWf((w) => w ? { ...w, steps: w.steps.filter((_, idx) => idx !== i) } : w);
  const move = (i: number, dir: -1 | 1) => setWf((w) => { if (!w) return w; const s = [...w.steps]; const j = i + dir; if (j < 0 || j >= s.length) return w; [s[i], s[j]] = [s[j], s[i]]; return { ...w, steps: s }; });

  const save = async () => { if (!wf) return; await fetch(`/api/crm/workflows/${wf.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(wf) }); setSaved(true); setTimeout(() => setSaved(false), 2000); load(); };
  const remove = async (id: string) => { await fetch(`/api/crm/workflows/${id}`, { method: "DELETE" }); setWf(null); load(); };

  if (wf) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => setWf(null)} className="text-sm text-muted-foreground hover:text-foreground">← All workflows</button>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Input value={wf.name} onChange={(e) => set({ name: e.target.value })} className="max-w-xs text-lg font-semibold" />
          <div className="flex items-center gap-3">
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={wf.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> {wf.enabled ? "Active" : "Off"}</label>
            <Button onClick={save}>{saved ? "Saved" : "Save"}</Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(wf.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Trigger</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <select value={wf.trigger} onChange={(e) => set({ trigger: e.target.value })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">{TRIGGERS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
            {wf.trigger === "form_submitted" && (
              <select value={wf.triggerConfig?.formId || ""} onChange={(e) => set({ triggerConfig: { formId: e.target.value || null } })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
                <option value="">Any form</option>
                {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {wf.steps.map((s, i) => {
            const M = STEP_META[s.type]; const Icon = M?.icon || Bell;
            return (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground flex-1">{M?.l || s.type}</span>
                    <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === wf.steps.length - 1}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delStep(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {s.type === "send_email" && <><Input value={s.config.subject || ""} onChange={(e) => setStepCfg(i, "subject", e.target.value)} placeholder="Subject" className="h-8" /><Textarea value={s.config.body || ""} onChange={(e) => setStepCfg(i, "body", e.target.value)} rows={3} placeholder="Email body (markdown)" /></>}
                  {s.type === "send_sms" && <Textarea value={s.config.body || ""} onChange={(e) => setStepCfg(i, "body", e.target.value)} rows={2} placeholder="Text message" />}
                  {s.type === "wait" && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Wait</span><Input type="number" value={s.config.minutes ?? 1440} onChange={(e) => setStepCfg(i, "minutes", Number(e.target.value))} className="h-8 w-28" /><span className="text-muted-foreground">minutes {s.config.minutes >= 60 ? `(≈ ${(s.config.minutes / 60).toFixed(1)}h)` : ""}</span></div>}
                  {s.type === "create_task" && <Input value={s.config.title || ""} onChange={(e) => setStepCfg(i, "title", e.target.value)} placeholder="Task title" className="h-8" />}
                  {s.type === "add_tag" && <Input value={s.config.tag || ""} onChange={(e) => setStepCfg(i, "tag", e.target.value)} placeholder="Tag" className="h-8" />}
                  {s.type === "notify" && <Input value={s.config.message || ""} onChange={(e) => setStepCfg(i, "message", e.target.value)} placeholder="Notification text" className="h-8" />}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground mb-2">Add a step</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STEP_META).map(([type, m]) => { const Icon = m.icon; return <Button key={type} size="sm" variant="outline" onClick={() => addStep(type)}><Icon className="h-3.5 w-3.5 mr-1.5" /> {m.l}</Button>; })}
          </div>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <WorkflowIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground">Multi-step drip sequences — email, SMS, waits, and tasks triggered by CRM events.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crm"><Button size="sm" variant="outline"><KanbanSquare className="h-4 w-4 mr-1.5" /> Pipeline</Button></Link>
          <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1.5" /> New workflow</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        : list.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground"><WorkflowIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />No workflows yet.</CardContent></Card>
        : (
          <div className="space-y-2">
            {list.map((w) => (
              <button key={w.id} onClick={() => open(w.id)} className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors flex items-center justify-between">
                <div><p className="font-medium text-foreground">{w.name}</p><p className="text-xs text-muted-foreground">{TRIGGERS.find((t) => t.v === w.trigger)?.l} · {w.steps.length} steps · {w._count?.enrollments ?? 0} enrolled</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.enabled ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{w.enabled ? "Active" : "Off"}</span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
