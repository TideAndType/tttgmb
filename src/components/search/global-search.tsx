"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckSquare, FileText, MessageSquare, FolderOpen, Loader2, Clock } from "lucide-react";

interface SearchResults {
  tasks: { id: string; title: string; status: string; userId: string }[];
  proposals: { id: string; title: string; status: string; userId: string }[];
  messages: { id: string; title: string; projectId: string }[];
  projects: { id: string; name: string }[];
}

interface FlatItem {
  key: string;
  label: string;
  href: string;
  group: string;
  icon: React.ReactNode;
}

const RECENTS_KEY = "recentSearches";
const MAX_RECENTS = 6;

// Highlights every case-insensitive occurrence of the query within the label.
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Load recent searches once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecents((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENTS);
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearRecents = () => {
    setRecents([]);
    try { localStorage.removeItem(RECENTS_KEY); } catch { /* ignore */ }
  };

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data: SearchResults = await res.json();
      setResults(data);
      setOpen(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActive(-1);
    timerRef.current = setTimeout(() => fetchResults(query), 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Global "/" focuses the search (unless already typing somewhere).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Flatten results into an ordered list for keyboard navigation.
  const flat = useMemo<FlatItem[]>(() => {
    if (!results) return [];
    const items: FlatItem[] = [];
    results.projects.forEach((p) => items.push({ key: `pr-${p.id}`, label: p.name, href: `/projects/${p.id}`, group: "Projects", icon: <FolderOpen className="h-3.5 w-3.5" /> }));
    results.tasks.forEach((t) => items.push({ key: `t-${t.id}`, label: t.title, href: "/tasks", group: "Tasks", icon: <CheckSquare className="h-3.5 w-3.5" /> }));
    results.proposals.forEach((p) => items.push({ key: `pp-${p.id}`, label: p.title, href: "/proposals", group: "Proposals", icon: <FileText className="h-3.5 w-3.5" /> }));
    results.messages.forEach((m) => items.push({ key: `m-${m.id}`, label: m.title, href: `/projects/${m.projectId}`, group: "Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> }));
    return items;
  }, [results]);

  const hasResults = flat.length > 0;
  const showRecents = open && !query.trim() && recents.length > 0;

  function go(href: string) {
    saveRecent(query);
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); return; }
    if (showRecents) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, recents.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); setQuery(recents[active]); }
      return;
    }
    if (!hasResults) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const target = active >= 0 ? flat[active] : flat[0];
      if (target) go(target.href);
    }
  }

  // Group the flat list back for rendering while keeping global indices.
  let renderIndex = -1;
  const groups = ["Projects", "Tasks", "Proposals", "Messages"];

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…  (press /)"
          className="w-full pl-9 pr-9 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {open && (query.trim() || showRecents) && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-auto">
          {showRecents ? (
            <div className="py-1">
              <div className="px-3 py-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Recent</span>
                <button onClick={clearRecents} className="text-muted-foreground hover:text-foreground normal-case">Clear</button>
              </div>
              {recents.map((r, i) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-foreground truncate ${active === i ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {r}
                </button>
              ))}
            </div>
          ) : !loading && !hasResults ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            groups.map((group) => {
              const items = flat.filter((f) => f.group === group);
              if (items.length === 0) return null;
              const iconMap: Record<string, React.ReactNode> = {
                Projects: <FolderOpen className="h-3.5 w-3.5" />,
                Tasks: <CheckSquare className="h-3.5 w-3.5" />,
                Proposals: <FileText className="h-3.5 w-3.5" />,
                Messages: <MessageSquare className="h-3.5 w-3.5" />,
              };
              return (
                <div key={group} className="py-1">
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {iconMap[group]} {group}
                  </div>
                  {items.map((item) => {
                    renderIndex++;
                    const idx = renderIndex;
                    return (
                      <button
                        key={item.key}
                        onClick={() => go(item.href)}
                        onMouseEnter={() => setActive(idx)}
                        className={`w-full block px-4 py-2 text-sm text-left text-foreground truncate ${active === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                      >
                        <Highlight text={item.label} query={query} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
