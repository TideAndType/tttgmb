"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark as BookmarkIcon,
  CheckSquare,
  CalendarDays,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  project: { name: string } | null;
}
interface Event {
  id: string;
  title: string;
  date: string;
  calendar: { name: string; color: string } | null;
}
interface Bookmark {
  id: string;
  label: string;
  url: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const priorityColor: Record<string, string> = {
  HIGH: "bg-red-500/10 text-red-600 dark:text-red-400",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LOW: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default function MyBarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/my-bar", { cache: "no-store" });
      const d = await res.json();
      setTasks(d.tasks ?? []);
      setEvents(d.events ?? []);
      setBookmarks(d.bookmarks ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBookmark = async () => {
    if (!label.trim() || !url.trim()) return;
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url }),
    });
    if (res.ok) {
      const d = await res.json();
      setBookmarks((prev) => [d.bookmark, ...prev]);
      setLabel(""); setUrl(""); setAdding(false);
    }
  };

  const removeBookmark = async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BookmarkIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Bar</h1>
          <p className="text-sm text-muted-foreground">Your tasks, upcoming events, and bookmarks in one place</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Assigned tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">My Tasks ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nothing assigned to you right now 🎉</p>
              ) : (
                tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={t.projectId ? `/projects/${t.projectId}` : "/tasks"}
                    className="block rounded-md border border-border px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {t.project && <span className="truncate">{t.project.name}</span>}
                      {t.dueDate && <span>· Due {fmtDate(t.dueDate)}</span>}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Upcoming ({events.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No upcoming events.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.calendar?.color || "#6366f1" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      {e.calendar && <p className="text-xs text-muted-foreground truncate">{e.calendar.name}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(e.date)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Bookmarks */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Bookmarks ({bookmarks.length})</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {adding && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="sm:max-w-[200px]" />
                  <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={addBookmark}>Save</Button>
                </div>
              )}
              {bookmarks.length === 0 && !adding ? (
                <p className="text-sm text-muted-foreground py-2">No bookmarks yet. Pin links you visit often.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {bookmarks.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 group">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1 text-sm text-foreground hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{b.label}</span>
                      </a>
                      <button onClick={() => removeBookmark(b.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
