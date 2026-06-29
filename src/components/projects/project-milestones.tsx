"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, Check, Trash2, Plus } from "lucide-react";

interface Milestone { id: string; title: string; date: string; done: boolean; }

export function ProjectMilestones({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/projects/${projectId}/milestones`);
    if (res.ok) setMilestones((await res.json()).milestones || []);
  };
  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!title.trim() || !date) return;
    setAdding(true);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, date }),
    });
    setAdding(false);
    if (res.ok) { setTitle(""); setDate(""); load(); }
  };

  const toggle = async (m: Milestone) => {
    await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) });
    setMilestones((prev) => prev.map((x) => x.id === m.id ? { ...x, done: !x.done } : x));
  };

  const remove = async (id: string) => {
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    setMilestones((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {milestones.map((m) => (
            <li key={m.id} className="ml-4">
              <span className={`absolute -left-[7px] h-3 w-3 rounded-full ${m.done ? "bg-primary" : "bg-muted border border-border"}`} />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={`text-sm font-medium ${m.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${m.done ? "text-primary" : "text-muted-foreground"}`} onClick={() => toggle(m)} title={m.done ? "Mark incomplete" : "Mark complete"}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {canManage && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone" className="h-8 text-sm flex-1 min-w-[140px]" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm w-40" />
          <Button size="sm" className="h-8" onClick={add} disabled={adding || !title.trim() || !date}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add
          </Button>
        </div>
      )}
    </div>
  );
}
