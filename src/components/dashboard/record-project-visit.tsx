"use client";

import { useEffect } from "react";

const KEY = "recentProjects";
const MAX = 6;

// Drop this into a project page to record it in the client-side
// recently-visited list (read by the dashboard RecentlyVisited widget).
export function RecordProjectVisit({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list: { id: string; name: string; at: number }[] = raw ? JSON.parse(raw) : [];
      const next = [{ id, name, at: Date.now() }, ...list.filter((p) => p.id !== id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [id, name]);
  return null;
}
