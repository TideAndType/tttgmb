"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Plus, Trash2, Check, Copy, KanbanSquare } from "lucide-react";

type Window = { start: string; end: string };
type Availability = Record<string, Window[]>;
interface Booking { id: string; name: string; email: string; startAt: string; }
interface Cal {
  id: string; name: string; description: string | null; durationMin: number; bufferMin: number;
  timezone: string; availability: Availability; leadDays: number; accentColor: string; successMessage: string;
  _count?: { bookings: number }; bookings?: Booking[];
}

const DAYS: [string, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const TZS = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "Europe/London", "UTC"];

export default function BookingPage() {
  const [cals, setCals] = useState<Cal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cal | null>(null);
  const [tab, setTab] = useState<"setup" | "embed" | "bookings">("setup");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); load(); }, []);
  const load = async () => { const d = await fetch("/api/booking").then((r) => r.json()); setCals(d.calendars ?? []); setLoading(false); };

  const create = async () => {
    const d = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Book a Call" }) }).then((r) => r.json());
    openEditor(d.calendar.id);
  };
  const openEditor = async (id: string) => { const d = await fetch(`/api/booking/${id}`).then((r) => r.json()); setEditing(d.calendar); setTab("setup"); };
  const save = async (c: Cal) => { await fetch(`/api/booking/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }); load(); };
  const remove = async (id: string) => { await fetch(`/api/booking/${id}`, { method: "DELETE" }); setEditing(null); load(); };

  const setC = (p: Partial<Cal>) => setEditing((e) => e ? { ...e, ...p } : e);
  const toggleDay = (day: string) => setEditing((e) => {
    if (!e) return e;
    const av = { ...e.availability };
    if (av[day]?.length) delete av[day]; else av[day] = [{ start: "09:00", end: "17:00" }];
    return { ...e, availability: av };
  });
  const setWindow = (day: string, p: Partial<Window>) => setEditing((e) => e ? { ...e, availability: { ...e.availability, [day]: [{ ...(e.availability[day]?.[0] || { start: "09:00", end: "17:00" }), ...p }] } } : e);

  const snippet = editing ? `<iframe src="${origin}/embed/booking/${editing.id}" style="width:100%;border:0;min-height:560px" title="${editing.name}"></iframe>` : "";

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">← All calendars</button>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Input value={editing.name} onChange={(e) => setC({ name: e.target.value })} className="max-w-xs text-lg font-semibold" />
          <div className="flex gap-2"><Button onClick={() => save(editing)}>Save</Button><Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(editing.id)}><Trash2 className="h-4 w-4" /></Button></div>
        </div>
        <div className="flex gap-2">
          {(["setup", "embed", "bookings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm border capitalize ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{t === "bookings" ? `Bookings (${editing.bookings?.length ?? 0})` : t}</button>
          ))}
        </div>

        {tab === "setup" && (
          <Card><CardContent className="p-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">Meeting length (min)</label><Input type="number" value={editing.durationMin} onChange={(e) => setC({ durationMin: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Buffer between (min)</label><Input type="number" value={editing.bufferMin} onChange={(e) => setC({ bufferMin: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Bookable days ahead</label><Input type="number" value={editing.leadDays} onChange={(e) => setC({ leadDays: Number(e.target.value) })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Timezone</label>
              <select value={editing.timezone} onChange={(e) => setC({ timezone: e.target.value })} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">{TZS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Weekly availability</label>
              <div className="space-y-1.5">
                {DAYS.map(([key, lbl]) => {
                  const on = !!editing.availability[key]?.length;
                  const w = editing.availability[key]?.[0];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-16 text-sm flex items-center gap-1.5"><input type="checkbox" checked={on} onChange={() => toggleDay(key)} /> {lbl}</label>
                      {on && w ? (
                        <><input type="time" value={w.start} onChange={(e) => setWindow(key, { start: e.target.value })} className="border border-input rounded-md px-2 py-1 text-sm bg-background h-8" /><span className="text-muted-foreground text-sm">to</span><input type="time" value={w.end} onChange={(e) => setWindow(key, { end: e.target.value })} className="border border-input rounded-md px-2 py-1 text-sm bg-background h-8" /></>
                      ) : <span className="text-sm text-muted-foreground">Unavailable</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div><label className="text-xs text-muted-foreground">Accent color</label><input type="color" value={editing.accentColor} onChange={(e) => setC({ accentColor: e.target.value })} className="h-10 w-16 rounded border border-border bg-background block" /></div>
              <div><label className="text-xs text-muted-foreground">Confirmation message</label><Input value={editing.successMessage} onChange={(e) => setC({ successMessage: e.target.value })} /></div>
            </div>
          </CardContent></Card>
        )}

        {tab === "embed" && (
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Paste this into any website. Bookings create a contact and a confirmed booking in your CRM.</p>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
            <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />} Copy embed code</Button>
            <a href={`/embed/booking/${editing.id}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline">Preview booking page ↗</a>
          </CardContent></Card>
        )}

        {tab === "bookings" && (
          <Card><CardContent className="p-4">
            {!editing.bookings?.length ? <p className="text-sm text-muted-foreground py-6 text-center">No bookings yet.</p> : (
              <div className="space-y-2">
                {editing.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
                    <div><p className="font-medium text-foreground">{b.name}</p><p className="text-xs text-muted-foreground">{b.email}</p></div>
                    <span className="text-muted-foreground">{new Date(b.startAt).toLocaleString(undefined, { timeZone: "UTC" })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booking Calendars</h1>
            <p className="text-sm text-muted-foreground">Embeddable scheduling — bookings become contacts in your CRM.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crm"><Button size="sm" variant="outline"><KanbanSquare className="h-4 w-4 mr-1.5" /> Pipeline</Button></Link>
          <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1.5" /> New calendar</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        : cals.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />No calendars yet.</CardContent></Card>
        : (
          <div className="space-y-2">
            {cals.map((c) => (
              <button key={c.id} onClick={() => openEditor(c.id)} className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors flex items-center justify-between">
                <div><p className="font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">{c.durationMin} min</p></div>
                <span className="text-xs text-muted-foreground">{c._count?.bookings ?? 0} booking{(c._count?.bookings ?? 0) !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
