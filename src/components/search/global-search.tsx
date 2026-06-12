"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, CheckSquare, FileText, MessageSquare, FolderOpen } from "lucide-react";

interface SearchResults {
  tasks: { id: string; title: string; status: string; userId: string }[];
  proposals: { id: string; title: string; status: string; userId: string }[];
  messages: { id: string; title: string; projectId: string }[];
  projects: { id: string; name: string }[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setOpen(false); return; }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data: SearchResults = await res.json();
    setResults(data);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResults = results && (
    results.tasks.length > 0 ||
    results.proposals.length > 0 ||
    results.messages.length > 0 ||
    results.projects.length > 0
  );

  const isEmpty = results && !hasResults;

  function close() { setOpen(false); setQuery(""); setResults(null); }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-auto">
          {isEmpty && (
            <p className="px-4 py-3 text-sm text-muted-foreground">No results</p>
          )}

          {results && results.projects.length > 0 && (
            <Section title="Projects" icon={<FolderOpen className="h-3.5 w-3.5" />}>
              {results.projects.map((p) => (
                <ResultItem key={p.id} href={`/projects/${p.id}`} label={p.name} onClick={close} />
              ))}
            </Section>
          )}

          {results && results.tasks.length > 0 && (
            <Section title="Tasks" icon={<CheckSquare className="h-3.5 w-3.5" />}>
              {results.tasks.map((t) => (
                <ResultItem key={t.id} href="/tasks" label={t.title} onClick={close} />
              ))}
            </Section>
          )}

          {results && results.proposals.length > 0 && (
            <Section title="Proposals" icon={<FileText className="h-3.5 w-3.5" />}>
              {results.proposals.map((p) => (
                <ResultItem key={p.id} href="/proposals" label={p.title} onClick={close} />
              ))}
            </Section>
          )}

          {results && results.messages.length > 0 && (
            <Section title="Messages" icon={<MessageSquare className="h-3.5 w-3.5" />}>
              {results.messages.map((m) => (
                <ResultItem key={m.id} href={`/projects/${m.projectId}`} label={m.title} onClick={close} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground truncate"
    >
      {label}
    </Link>
  );
}
