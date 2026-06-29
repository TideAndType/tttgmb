"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { LifeBuoy, Plus, ArrowLeft, Loader2 } from "lucide-react";

interface TicketListItem { id: string; subject: string; status: string; updatedAt: string; _count: { messages: number }; }
interface Msg { id: string; userId: string; authorName: string; body: string; isStaff: boolean; createdAt: string; }
interface TicketDetail { id: string; subject: string; status: string; messages: Msg[]; }

const statusColor: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 border border-amber-200",
  pending: "bg-blue-100 text-blue-800 border border-blue-200",
  closed: "bg-muted text-muted-foreground border",
};

export function SupportCenter({ staff = false }: { staff?: boolean }) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [active, setActive] = useState<TicketDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/support/tickets");
    if (res.ok) setTickets((await res.json()).tickets || []);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openTicket = async (id: string) => {
    const res = await fetch(`/api/support/tickets/${id}`);
    if (res.ok) setActive((await res.json()).ticket);
  };

  const submitNew = async () => {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body }) });
    setBusy(false);
    if (res.ok) { setSubject(""); setBody(""); setCreating(false); loadList(); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setBusy(true);
    const res = await fetch(`/api/support/tickets/${active.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) });
    setBusy(false);
    if (res.ok) { setReply(""); openTicket(active.id); loadList(); }
  };

  const setStatus = async (status: string) => {
    if (!active) return;
    await fetch(`/api/support/tickets/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    openTicket(active.id); loadList();
  };

  // ── Ticket detail view ──
  if (active) {
    return (
      <div>
        <button onClick={() => setActive(null)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </button>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">{active.subject}</h2>
          {staff ? (
            <select value={active.status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-input rounded-md px-2 py-1 bg-background">
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          ) : (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[active.status] || ""}`}>{active.status}</span>
          )}
        </div>

        <div className="space-y-4 mb-4">
          {active.messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.isStaff ? "flex-row-reverse" : ""}`}>
              <UserAvatar name={m.authorName} seed={m.userId} className="h-7 w-7 text-[10px] mt-0.5" />
              <div className={`max-w-[80%] ${m.isStaff ? "text-right" : ""}`}>
                <p className="text-xs text-muted-foreground">{m.authorName}{m.isStaff ? " · Support" : ""} · {new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                <div className={`inline-block rounded-2xl px-3 py-1.5 text-sm mt-0.5 ${m.isStaff ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <span className="whitespace-pre-wrap break-words">{m.body}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {active.status !== "closed" && (
          <div className="flex items-end gap-2">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Write a reply…" className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none" />
            <Button onClick={sendReply} disabled={busy || !reply.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}</Button>
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{staff ? "Support" : "Help & Support"}</h1>
            <p className="text-sm text-muted-foreground">{staff ? "Client support tickets" : "Open a ticket and we'll get back to you"}</p>
          </div>
        </div>
        {!staff && <Button onClick={() => setCreating((c) => !c)}><Plus className="h-4 w-4 mr-1.5" />New ticket</Button>}
      </div>

      {creating && !staff && (
        <Card className="mb-6">
          <CardContent className="py-4 space-y-3">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Describe your issue…" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none" />
            <Button onClick={submitNew} disabled={busy || !subject.trim() || !body.trim()}>{busy ? "Submitting…" : "Submit ticket"}</Button>
          </CardContent>
        </Card>
      )}

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets yet.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => openTicket(t.id)} className="w-full text-left">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">{t._count.messages} message{t._count.messages !== 1 ? "s" : ""} · {new Date(t.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor[t.status] || ""}`}>{t.status}</span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
