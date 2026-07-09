"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Trash2, Phone, Mail, StickyNote, CalendarClock, MessageSquare, Send, Workflow } from "lucide-react";

interface Activity { id: string; type: string; body: string; authorName: string | null; createdAt: string; }
interface Opp { id: string; title: string; value: number; status: string; pipeline: { name: string }; stage: { name: string; color: string }; }
interface Contact {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  source: string | null; status: string; notes: string | null; activities: Activity[]; opportunities: Opp[];
}

const ACT_ICON: Record<string, any> = { call: Phone, email: Mail, meeting: CalendarClock, note: StickyNote };

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logType, setLogType] = useState("note");
  const [logBody, setLogBody] = useState("");
  const [sms, setSms] = useState<{ id: string; direction: string; body: string; createdAt: string }[]>([]);
  const [smsBody, setSmsBody] = useState("");
  const [smsErr, setSmsErr] = useState("");
  const [sending, setSending] = useState(false);
  const [workflows, setWorkflows] = useState<{ id: string; name: string; enabled: boolean }[]>([]);
  const [wfPick, setWfPick] = useState("");
  const [wfMsg, setWfMsg] = useState("");

  const loadSms = () => fetch(`/api/crm/contacts/${id}/sms`).then((r) => r.json()).then((d) => setSms(d.messages ?? [])).catch(() => {});

  const load = async () => {
    const r = await fetch(`/api/crm/contacts/${id}`);
    if (r.ok) setC((await r.json()).contact);
  };
  useEffect(() => {
    load(); loadSms();
    fetch("/api/crm/workflows").then((r) => r.json()).then((d) => setWorkflows((d.workflows ?? []).map((w: any) => ({ id: w.id, name: w.name, enabled: w.enabled })))).catch(() => {});
    /* eslint-disable-next-line */
  }, [id]);

  const enroll = async () => {
    if (!wfPick) return;
    setWfMsg("");
    const r = await fetch(`/api/crm/workflows/${wfPick}/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: id }) });
    const d = await r.json();
    setWfMsg(r.ok ? "Enrolled ✓" : (d.error || "Couldn't enroll."));
    if (r.ok) { setWfPick(""); load(); }
    setTimeout(() => setWfMsg(""), 3000);
  };

  const sendSmsMsg = async () => {
    if (!smsBody.trim()) return;
    setSending(true); setSmsErr("");
    const r = await fetch(`/api/crm/contacts/${id}/sms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: smsBody }) });
    const d = await r.json();
    setSending(false);
    if (!r.ok) { setSmsErr(d.error || "Couldn't send."); return; }
    setSmsBody(""); loadSms();
  };

  const set = (p: Partial<Contact>) => setC((prev) => prev ? { ...prev, ...p } : prev);

  const save = async () => {
    if (!c) return;
    setSaving(true); setSaved(false);
    await fetch(`/api/crm/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: c.name, email: c.email, phone: c.phone, company: c.company, source: c.source, status: c.status, notes: c.notes }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const log = async () => {
    if (!logBody.trim()) return;
    await fetch(`/api/crm/contacts/${id}/activities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: logType, body: logBody }) });
    setLogBody(""); load();
  };

  const remove = async () => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/crm/contacts/${id}`, { method: "DELETE" });
    router.push("/crm/contacts");
  };

  if (!c) return <div className="max-w-3xl mx-auto"><p className="text-muted-foreground">Loading…</p></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/crm/contacts" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Contacts</Link>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Details</CardTitle>
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" />
            <Input value={c.company ?? ""} onChange={(e) => set({ company: e.target.value })} placeholder="Company" />
            <Input value={c.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="Email" />
            <Input value={c.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="Phone" />
            <Input value={c.source ?? ""} onChange={(e) => set({ source: e.target.value })} placeholder="Source" />
            <select value={c.status} onChange={(e) => set({ status: e.target.value })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
              {["lead", "qualified", "customer", "lost"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Textarea value={c.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Notes" />
            <Button onClick={save} disabled={saving}>{saved ? "Saved" : saving ? "Saving…" : <><Save className="h-4 w-4 mr-1.5" /> Save</>}</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {c.opportunities.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {c.opportunities.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{o.title}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: o.stage.color + "20", color: o.stage.color }}>{o.stage.name}</span>
                      <span className="text-muted-foreground">${o.value.toLocaleString()}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Log activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1">
                {["note", "call", "email", "meeting"].map((t) => (
                  <button key={t} onClick={() => setLogType(t)} className={`px-2.5 py-1 rounded-full text-xs border capitalize ${logType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{t}</button>
                ))}
              </div>
              <Textarea value={logBody} onChange={(e) => setLogBody(e.target.value)} rows={2} placeholder={`Log a ${logType}…`} />
              <Button size="sm" onClick={log} disabled={!logBody.trim()}>Log</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Text messages</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!c.phone ? (
                <p className="text-sm text-muted-foreground">Add a phone number to text this contact.</p>
              ) : (
                <>
                  <div className="max-h-56 overflow-y-auto space-y-1.5">
                    {sms.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : sms.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`text-[10px] mt-0.5 ${m.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {smsErr && <p className="text-xs text-destructive">{smsErr}</p>}
                  <div className="flex gap-2">
                    <Textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={1} placeholder="Type a text…" className="resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSmsMsg(); } }} />
                    <Button size="sm" onClick={sendSmsMsg} disabled={sending || !smsBody.trim()} className="shrink-0 self-end"><Send className="h-4 w-4" /></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {workflows.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /> Add to workflow</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <select value={wfPick} onChange={(e) => setWfPick(e.target.value)} className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
                    <option value="">Choose a workflow…</option>
                    {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}{w.enabled ? "" : " (off)"}</option>)}
                  </select>
                  <Button size="sm" onClick={enroll} disabled={!wfPick}>Enroll</Button>
                </div>
                {wfMsg && <p className="text-xs text-muted-foreground">{wfMsg}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          {c.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {c.activities.map((a) => {
                const Icon = ACT_ICON[a.type] || StickyNote;
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="mt-0.5 text-primary shrink-0"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{a.type} · {a.authorName || "Team"} · {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
