"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, RefreshCw } from "lucide-react";

interface Item { id: string; type: string; title: string; status: string; scheduledAt: string; }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_COLOR: Record<string, string> = {
  blog: "#6366f1", facebook: "#3b82f6", instagram: "#ec4899", linkedin: "#0a66c2",
  gbp: "#22c55e", email: "#f59e0b", video: "#ef4444",
};

function dateKey(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

export default function ContentCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/marketing/calendar").then((r) => r.json());
    setItems(d.items ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true); setError("");
    const r = await fetch("/api/marketing/calendar/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weeks: 4 }) });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate a plan.");
    else load();
    setBusy(false);
  };

  const byDate = new Map<string, Item[]>();
  for (const it of items) {
    const d = new Date(it.scheduledAt);
    const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(it);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
            <p className="text-sm text-muted-foreground">Your rolling AI content plan across channels.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Generate 4-week plan
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(TYPE_COLOR).map(([t, c]) => <span key={t} className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />{t}</span>)}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 border border-border rounded-md hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold w-36 text-center">{MONTHS[month]} {year}</span>
          <button onClick={next} className="p-1.5 border border-border rounded-md hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
          {DAYS.map((d) => <div key={d} className="border-r border-b border-border px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 text-center">{d}</div>)}
          {cells.map((day, idx) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayItems = day ? byDate.get(dateKey(year, month, day)) ?? [] : [];
            return (
              <div key={idx} className={`border-r border-b border-border p-1.5 min-h-[92px] flex flex-col ${!day ? "bg-muted/20" : ""}`}>
                {day && <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"}`}>{day}</span>}
                <div className="flex flex-col gap-0.5">
                  {dayItems.slice(0, 3).map((it) => (
                    <Link key={it.id} href="/marketing/content" className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] truncate border" style={{ backgroundColor: (TYPE_COLOR[it.type] || "#6366f1") + "20", borderColor: (TYPE_COLOR[it.type] || "#6366f1") + "55", color: TYPE_COLOR[it.type] || "#6366f1" }} title={`${it.type}: ${it.title}`}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLOR[it.type] || "#6366f1" }} />
                      <span className="truncate">{it.title}</span>
                    </Link>
                  ))}
                  {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Generated items are scheduled drafts. Open <Link href="/marketing/content" className="text-primary hover:underline">Content Studio</Link> to expand any into full copy and approve.</p>
    </div>
  );
}
