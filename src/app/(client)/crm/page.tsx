"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanSquare, Plus, Users, Trophy, XCircle, GripVertical, Trash2 } from "lucide-react";

interface Contact { id: string; name: string; company: string | null; }
interface Opp { id: string; title: string; value: number; status: string; stageId: string; position: number; contact: Contact | null; }
interface Stage { id: string; name: string; color: string; position: number; opportunities: Opp[]; }
interface Pipeline { id: string; name: string; stages: Stage[]; }

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function CrmBoardPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null); // stageId
  const [form, setForm] = useState({ title: "", value: "", contactId: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/crm/pipelines").then((r) => r.json());
    setPipelines(d.pipelines ?? []);
    if (d.pipelines?.[0] && !activeId) setActiveId(d.pipelines[0].id);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); fetch("/api/crm/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts ?? [])).catch(() => {}); }, [load]);

  const pipeline = pipelines.find((p) => p.id === activeId) || pipelines[0];

  const addOpp = async (stageId: string) => {
    if (!form.title.trim() || !pipeline) return;
    const r = await fetch("/api/crm/opportunities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, value: form.value, contactId: form.contactId || undefined, pipelineId: pipeline.id, stageId }),
    });
    if (r.ok) { setForm({ title: "", value: "", contactId: "" }); setAdding(null); load(); }
  };

  const moveOpp = async (oppId: string, toStageId: string) => {
    // optimistic
    setPipelines((prev) => prev.map((p) => p.id !== pipeline?.id ? p : {
      ...p,
      stages: p.stages.map((s) => ({ ...s, opportunities: s.opportunities.filter((o) => o.id !== oppId) }))
        .map((s) => {
          if (s.id !== toStageId) return s;
          const moved = pipeline!.stages.flatMap((x) => x.opportunities).find((o) => o.id === oppId);
          return moved ? { ...s, opportunities: [...s.opportunities, { ...moved, stageId: toStageId }] } : s;
        }),
    }));
    await fetch(`/api/crm/opportunities/${oppId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId: toStageId }) });
  };

  const setStatus = async (oppId: string, status: string) => {
    setPipelines((prev) => prev.map((p) => ({ ...p, stages: p.stages.map((s) => ({ ...s, opportunities: s.opportunities.map((o) => o.id === oppId ? { ...o, status } : o) })) })));
    await fetch(`/api/crm/opportunities/${oppId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  };

  const remove = async (oppId: string) => {
    setPipelines((prev) => prev.map((p) => ({ ...p, stages: p.stages.map((s) => ({ ...s, opportunities: s.opportunities.filter((o) => o.id !== oppId) })) })));
    await fetch(`/api/crm/opportunities/${oppId}`, { method: "DELETE" });
  };

  const allOpps = pipeline?.stages.flatMap((s) => s.opportunities) ?? [];
  const openValue = allOpps.filter((o) => o.status === "open").reduce((a, o) => a + o.value, 0);
  const wonValue = allOpps.filter((o) => o.status === "won").reduce((a, o) => a + o.value, 0);

  return (
    <div className="max-w-full space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <KanbanSquare className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Track deals through your sales stages. Drag cards between stages.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pipelines.length > 1 && (
            <select value={activeId} onChange={(e) => setActiveId(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-background h-9">
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <Link href="/crm/contacts"><Button size="sm" variant="outline"><Users className="h-4 w-4 mr-1.5" /> Contacts</Button></Link>
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="rounded-md border border-border bg-card px-3 py-1.5">Open: <b className="text-foreground">{money(openValue)}</b></span>
        <span className="rounded-md border border-border bg-card px-3 py-1.5">Won: <b className="text-green-600">{money(wonValue)}</b></span>
        <span className="rounded-md border border-border bg-card px-3 py-1.5">Deals: <b className="text-foreground">{allOpps.length}</b></span>
      </div>

      {loading ? (
        <div className="flex gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-64" />)}</div>
      ) : !pipeline ? null : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {pipeline.stages.map((stage) => {
            const stageValue = stage.opportunities.filter((o) => o.status === "open").reduce((a, o) => a + o.value, 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) { moveOpp(dragId, stage.id); setDragId(null); } }}
                className="w-72 shrink-0 rounded-lg border border-border bg-surface-2 bg-muted/30 flex flex-col"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold text-foreground flex-1">{stage.name}</span>
                  <span className="text-xs text-muted-foreground">{stage.opportunities.length}</span>
                </div>
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">{money(stageValue)}</div>
                <div className="p-2 flex flex-col gap-2 flex-1 min-h-[60px]">
                  {stage.opportunities.map((o) => (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={() => setDragId(o.id)}
                      className={`group rounded-md border border-border bg-card p-2.5 cursor-grab active:cursor-grabbing ${o.status === "won" ? "border-green-500/50" : o.status === "lost" ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{o.title}</p>
                          {o.contact && <p className="text-xs text-muted-foreground truncate">{o.contact.name}{o.contact.company ? ` · ${o.contact.company}` : ""}</p>}
                          <p className="text-xs font-semibold text-foreground mt-0.5">{money(o.value)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setStatus(o.id, o.status === "won" ? "open" : "won")} title="Won" className="text-muted-foreground hover:text-green-600"><Trophy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setStatus(o.id, o.status === "lost" ? "open" : "lost")} title="Lost" className="text-muted-foreground hover:text-red-600"><XCircle className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(o.id)} title="Delete" className="text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}

                  {adding === stage.id ? (
                    <div className="rounded-md border border-border bg-card p-2 space-y-1.5">
                      <Input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Deal title" className="h-8 text-sm" />
                      <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="Value ($)" type="number" className="h-8 text-sm" />
                      <select value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))} className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background h-8">
                        <option value="">No contact</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="flex gap-1"><Button size="sm" className="h-7 flex-1" onClick={() => addOpp(stage.id)}>Add</Button><Button size="sm" variant="ghost" className="h-7" onClick={() => setAdding(null)}>×</Button></div>
                    </div>
                  ) : (
                    <button onClick={() => { setAdding(stage.id); setForm({ title: "", value: "", contactId: "" }); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 py-1"><Plus className="h-3.5 w-3.5" /> Add deal</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
