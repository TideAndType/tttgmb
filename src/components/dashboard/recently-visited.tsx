"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, History } from "lucide-react";

interface Recent { id: string; name: string; at: number; }

// Reads the client-side recently-visited project list. Renders nothing until
// the user has actually visited a project, so it stays out of the way for
// fresh accounts.
export function RecentlyVisited() {
  const [items, setItems] = useState<Recent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentProjects");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <History className="h-4 w-4" /> Recently visited
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary/50 hover:bg-accent transition-colors"
          >
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate max-w-[160px]">{p.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
