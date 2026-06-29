"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";

// Agency-side time logging attached to a task or project. Shows the running
// total and a compact "log time" form. One of taskId/projectId should be set.
export function TimeLogger({ taskId, projectId }: { taskId?: string; projectId?: string }) {
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const query = taskId ? `taskId=${taskId}` : `projectId=${projectId}`;

  const loadTotal = useCallback(async () => {
    try {
      const res = await fetch(`/api/time?${query}&days=0`);
      if (res.ok) {
        const data = await res.json();
        const mins = (data.entries || []).reduce((s: number, e: any) => s + (e.minutes || 0), 0);
        setTotalMinutes(mins);
      }
    } catch {
      /* ignore */
    }
  }, [query]);

  useEffect(() => { loadTotal(); }, [loadTotal]);

  const log = async () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: taskId || null,
          projectId: projectId || null,
          minutes: Math.round(h * 60),
          description: note.trim() || null,
        }),
      });
      if (res.ok) {
        setHours("");
        setNote("");
        setOpen(false);
        loadTotal();
      }
    } finally {
      setSaving(false);
    }
  };

  const totalLabel = totalMinutes != null ? `${(totalMinutes / 60).toFixed(1)}h logged` : "—";

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Clock className="h-3 w-3" />
        {totalLabel}
        <span className="text-primary ml-1">{open ? "Cancel" : "+ Log time"}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Hours"
            className="w-20 text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            onKeyDown={(e) => e.key === "Enter" && log()}
            className="flex-1 min-w-[120px] text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" className="h-7 text-xs px-3" onClick={log} disabled={saving || !hours}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Log"}
          </Button>
        </div>
      )}
    </div>
  );
}
