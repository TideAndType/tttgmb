"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Mail, Plus, Trash2, Send, Users, KanbanSquare, Eye, Pencil } from "lucide-react";

interface Campaign {
  id: string; name: string; subject: string; body: string; audienceStatus: string | null; audienceTag: string | null;
  status: string; recipientCount: number; sentCount: number; failedCount: number; sentAt: string | null;
}

const STATUSES = [{ v: "", l: "All contacts" }, { v: "lead", l: "Leads" }, { v: "qualified", l: "Qualified" }, { v: "customer", l: "Customers" }];

export default function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState(0);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => { const d = await fetch("/api/crm/campaigns").then((r) => r.json()); setList(d.campaigns ?? []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const create = async () => { const d = await fetch("/api/crm/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Campaign" }) }).then((r) => r.json()); open(d.campaign.id); };
  const open = async (id: string) => { const d = await fetch(`/api/crm/campaigns/${id}`).then((r) => r.json()); setEditing(d.campaign); setRecipients(d.recipientCount ?? 0); setPreview(false); setError(""); };
  const setC = (p: Partial<Campaign>) => setEditing((e) => e ? { ...e, ...p } : e);

  const saveAndCount = async (c: Campaign) => {
    const d = await fetch(`/api/crm/campaigns/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).then((r) => r.json());
    if (d.campaign) { const g = await fetch(`/api/crm/campaigns/${c.id}`).then((r) => r.json()); setRecipients(g.recipientCount ?? 0); }
    load();
  };
  const send = async () => {
    if (!editing) return;
    if (!confirm(`Send "${editing.name}" to ${recipients} contact${recipients !== 1 ? "s" : ""}?`)) return;
    setBusy(true); setError("");
    await fetch(`/api/crm/campaigns/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const r = await fetch(`/api/crm/campaigns/${editing.id}/send`, { method: "POST" });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || "Send failed."); return; }
    setEditing(d.campaign); load();
  };
  const remove = async (id: string) => { await fetch(`/api/crm/campaigns/${id}`, { method: "DELETE" }); setEditing(null); load(); };

  if (editing) {
    const sent = editing.status === "sent";
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => { setEditing(null); }} className="text-sm text-muted-foreground hover:text-foreground">← All campaigns</button>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Input value={editing.name} onChange={(e) => setC({ name: e.target.value })} disabled={sent} className="max-w-xs text-lg font-semibold" />
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(editing.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}
        {sent ? (
          <div className="rounded-md bg-green-500/10 text-green-600 text-sm px-3 py-2">Sent to {editing.sentCount} contact{editing.sentCount !== 1 ? "s" : ""}{editing.failedCount ? ` · ${editing.failedCount} failed` : ""} on {editing.sentAt ? new Date(editing.sentAt).toLocaleString() : ""}.</div>
        ) : (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Sending to <b>{recipients}</b> contact{recipients !== 1 ? "s" : ""} with an email address.</div>
        )}

        <Card><CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">Audience</label>
              <select value={editing.audienceStatus ?? ""} onChange={(e) => setC({ audienceStatus: e.target.value || null })} disabled={sent} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select>
            </div>
            <div><label className="text-xs text-muted-foreground">Tag filter (optional)</label><Input value={editing.audienceTag ?? ""} onChange={(e) => setC({ audienceTag: e.target.value || null })} disabled={sent} placeholder="e.g. vip" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Subject</label><Input value={editing.subject} onChange={(e) => setC({ subject: e.target.value })} disabled={sent} placeholder="Email subject" /></div>
          <div>
            <div className="flex items-center justify-between"><label className="text-xs text-muted-foreground">Body (markdown)</label>
              <button onClick={() => setPreview((p) => !p)} className="text-xs text-primary hover:underline inline-flex items-center gap-1">{preview ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}</button>
            </div>
            {preview ? <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[160px]"><RichTextContent text={editing.body || "_Nothing yet_"} /></div>
              : <Textarea value={editing.body} onChange={(e) => setC({ body: e.target.value })} disabled={sent} rows={9} placeholder="Write your email… **markdown** supported" />}
          </div>
          {!sent && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => saveAndCount(editing)}>Save</Button>
              <Button onClick={send} disabled={busy || recipients === 0}><Send className="h-4 w-4 mr-1.5" /> {busy ? "Sending…" : `Send to ${recipients}`}</Button>
            </div>
          )}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground">Broadcast to your CRM contacts via your own email provider.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/contacts"><Button size="sm" variant="outline"><KanbanSquare className="h-4 w-4 mr-1.5" /> Contacts</Button></Link>
          <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1.5" /> New campaign</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        : list.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground"><Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />No campaigns yet.</CardContent></Card>
        : (
          <div className="space-y-2">
            {list.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors flex items-center justify-between">
                <div><p className="font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">{c.subject || "No subject"}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "sent" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{c.status === "sent" ? `Sent · ${c.sentCount}` : "Draft"}</span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
