"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Play, Square } from "lucide-react";

function hhmmss(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// Agency-side time tracking on a task or project: a live stopwatch (start/stop)
// plus a manual hours entry. Running timers persist in localStorage so they keep
// counting across navigation/refresh.
export function TimeLogger({ taskId, projectId }: { taskId?: string; projectId?: string }) {
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  const [billedMinutes, setBilledMinutes] = useState(0);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Stopwatch
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const query = taskId ? `taskId=${taskId}` : `projectId=${projectId}`;
  const storageKey = `tt-timer-${taskId || projectId}`;

  const loadTotal = useCallback(async () => {
    try {
      const res = await fetch(`/api/time?${query}&days=0`);
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries || [];
        setTotalMinutes(entries.reduce((s: number, e: any) => s + (e.minutes || 0), 0));
        setBilledMinutes(entries.reduce((s: number, e: any) => s + (e.billedAt ? (e.minutes || 0) : 0), 0));
      }
    } catch { /* ignore */ }
  }, [query]);

  useEffect(() => { loadTotal(); }, [loadTotal]);

  // Resume a running timer from localStorage on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const ts = Number(JSON.parse(saved).startedAt);
        if (ts > 0) setStartedAt(ts);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Tick every second while running.
  useEffect(() => {
    if (startedAt) {
      setNow(Date.now());
      tick.current = setInterval(() => setNow(Date.now()), 1000);
      return () => { if (tick.current) clearInterval(tick.current); };
    }
  }, [startedAt]);

  const start = () => {
    const ts = Date.now();
    setStartedAt(ts);
    try { localStorage.setItem(storageKey, JSON.stringify({ startedAt: ts })); } catch { /* ignore */ }
  };

  const stopAndLog = async () => {
    if (!startedAt) return;
    const elapsedSec = (Date.now() - startedAt) / 1000;
    const minutes = Math.max(1, Math.round(elapsedSec / 60));
    setStartedAt(null);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setSaving(true);
    try {
      await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskId || null, projectId: projectId || null, minutes, description: note.trim() || null }),
      });
      setNote("");
      loadTotal();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setStartedAt(null);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const log = async () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskId || null, projectId: projectId || null, minutes: Math.round(h * 60), description: note.trim() || null }),
      });
      if (res.ok) { setHours(""); setNote(""); setOpen(false); loadTotal(); }
    } finally {
      setSaving(false);
    }
  };

  const newMinutes = (totalMinutes ?? 0) - billedMinutes;
  const elapsedSec = startedAt ? (now - startedAt) / 1000 : 0;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {totalMinutes == null ? "—" : billedMinutes > 0 ? (
            <>
              <span className="text-muted-foreground">Billed {(billedMinutes / 60).toFixed(1)}h</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium text-foreground">New {(newMinutes / 60).toFixed(1)}h</span>
            </>
          ) : (
            <span>{(newMinutes / 60).toFixed(1)}h logged</span>
          )}
        </span>

        {startedAt ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-foreground">{hhmmss(elapsedSec)}</span>
            <Button size="sm" className="h-7 text-xs px-2" onClick={stopAndLog} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Square className="h-3 w-3 mr-1" /> Stop &amp; log</>}
            </Button>
            <button onClick={discard} className="text-xs text-muted-foreground hover:text-destructive">Discard</button>
          </span>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={start}>
            <Play className="h-3 w-3 mr-1" /> Start timer
          </Button>
        )}

        <button onClick={() => setOpen((o) => !o)} className="text-xs text-primary hover:underline">
          {open ? "Cancel" : "+ Log manually"}
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours"
            className="w-20 text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" onKeyDown={(e) => e.key === "Enter" && log()}
            className="flex-1 min-w-[120px] text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <Button size="sm" className="h-7 text-xs px-3" onClick={log} disabled={saving || !hours}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Log"}
          </Button>
        </div>
      )}
    </div>
  );
}
