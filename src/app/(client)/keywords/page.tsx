"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Search, Plus, X, TrendingUp, TrendingDown, Minus, Tag, Folder as FolderIcon, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  prevPosition: number | null;
  positionChange: number | null;
  ctr: number;
}

type RangeKey = "30d" | "90d" | "120d" | "thisYear" | "lastYear" | "custom";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "120d", label: "Last 120 days" },
  { value: "thisYear", label: "This year" },
  { value: "lastYear", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

interface TrackedKeyword {
  id: string;
  query: string;
  tags: string[];
  folderId: string | null;
  latest: { date: string; position: number; clicks: number; impressions: number; ctr: number } | null;
  change: number | null;
  history: { date: string; position: number }[];
}

interface Folder {
  id: string;
  name: string;
  count?: number;
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos <= 3) return <Badge variant="default">#{pos.toFixed(1)}</Badge>;
  if (pos <= 10) return <Badge variant="secondary">#{pos.toFixed(1)}</Badge>;
  return <Badge variant="outline">#{Math.round(pos)}</Badge>;
}

function Change({ change }: { change: number | null }) {
  if (change === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" />+{change}
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
        <TrendingDown className="h-3.5 w-3.5" />{change}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Minus className="h-3.5 w-3.5" />0
    </span>
  );
}

// Sparkline of position over time. Position is inverted (lower = better) so we
// flip the axis to make an upward line mean improving rank.
function Sparkline({ history }: { history: { date: string; position: number }[] }) {
  if (history.length < 2) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <YAxis hide reversed domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function KeywordsPage() {
  const [discovered, setDiscovered] = useState<KeywordRow[]>([]);
  const [tracked, setTracked] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(true);
  const [error, setError] = useState("");

  const [newKeyword, setNewKeyword] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newFolderForKeyword, setNewFolderForKeyword] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  const [folders, setFolders] = useState<Folder[]>([]);
  // null = all, "none" = uncategorized, otherwise a folder id
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  type SortKey = "query" | "folder" | "position" | "change";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  type DiscKey = "query" | "clicks" | "impressions" | "ctr" | "position" | "positionChange";
  const [discSortKey, setDiscSortKey] = useState<DiscKey | null>(null);
  const [discSortDir, setDiscSortDir] = useState<"asc" | "desc">("asc");

  // Reporting window for the "From Search Console" list.
  const [range, setRange] = useState<RangeKey>("90d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [rangeLabel, setRangeLabel] = useState("last 90 days");

  const toggleDiscSort = (key: DiscKey) => {
    if (discSortKey === key) {
      setDiscSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDiscSortKey(key);
      // Metrics are most useful highest-first; query defaults A→Z.
      setDiscSortDir(key === "query" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    await Promise.all([loadTracked(), loadFolders()]);
    // Record today's snapshot in the background, then refresh history.
    fetch("/api/keywords/snapshot", { method: "POST" })
      .then((r) => (r.ok ? loadTracked() : null))
      .catch(() => {});
    await loadDiscovered();
    setLoading(false);
  };

  const loadTracked = async () => {
    const res = await fetch("/api/keywords/tracked");
    if (res.ok) {
      const data = await res.json();
      setTracked(data.keywords || []);
    }
  };

  const loadFolders = async () => {
    const res = await fetch("/api/keywords/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders || []);
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setError("");
    const res = await fetch("/api/keywords/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't create folder. The folders table may not exist yet — run the KeywordFolder migration SQL in Neon.");
      return;
    }
    setNewFolderName("");
    loadFolders();
  };

  const deleteFolder = async (id: string) => {
    await fetch(`/api/keywords/folders/${id}`, { method: "DELETE" });
    if (activeFolder === id) setActiveFolder(null);
    await Promise.all([loadFolders(), loadTracked()]);
  };

  const moveToFolder = async (keywordId: string, folderId: string | null) => {
    await fetch(`/api/keywords/tracked/${keywordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    await Promise.all([loadTracked(), loadFolders()]);
  };

  const loadDiscovered = async () => {
    try {
      const params = new URLSearchParams({ type: "keywords", range });
      if (range === "custom" && customStart && customEnd) {
        params.set("start", customStart);
        params.set("end", customEnd);
      }
      const res = await fetch(`/api/gsc/data?${params.toString()}`);
      if (res.status === 400 || res.status === 401) {
        setGscConnected(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to load keywords");
        return;
      }
      const data = await res.json();
      setDiscovered(data.keywords || []);
      if (data.rangeLabel) setRangeLabel(data.rangeLabel);
    } catch {
      setError("Failed to load keyword data");
    }
  };

  const trackedQueries = useMemo(
    () => new Set(tracked.map((t) => t.query.toLowerCase())),
    [tracked]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tracked.forEach((t) => t.tags.forEach((tag) => s.add(tag)));
    return Array.from(s).sort();
  }, [tracked]);

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name || "";

  const visibleTracked = tracked
    .filter((t) => {
      if (activeFolder === "none" && t.folderId) return false;
      if (activeFolder && activeFolder !== "none" && t.folderId !== activeFolder) return false;
      if (activeTag && !t.tags.includes(activeTag)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      let cmp = 0;
      if (sortKey === "query") {
        cmp = a.query.localeCompare(b.query);
      } else if (sortKey === "folder") {
        cmp = folderName(a.folderId).localeCompare(folderName(b.folderId));
      } else if (sortKey === "position") {
        // Keywords without a snapshot sort to the bottom regardless of direction.
        const ap = a.latest?.position ?? Infinity;
        const bp = b.latest?.position ?? Infinity;
        cmp = ap - bp;
      } else if (sortKey === "change") {
        const ac = a.change ?? -Infinity;
        const bc = b.change ?? -Infinity;
        cmp = ac - bc;
      }
      return cmp * dir;
    });

  const SortHead = ({ column, label, className }: { column: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(column)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className || ""}`}
    >
      {label}
      {sortKey === column ? (
        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  const sortedDiscovered = [...discovered].sort((a, b) => {
    if (!discSortKey) return 0;
    const dir = discSortDir === "asc" ? 1 : -1;
    let cmp: number;
    if (discSortKey === "query") {
      cmp = a.query.localeCompare(b.query);
    } else if (discSortKey === "positionChange") {
      // Unknown change sorts to the bottom regardless of direction.
      cmp = (a.positionChange ?? -Infinity) - (b.positionChange ?? -Infinity);
    } else {
      cmp = a[discSortKey] - b[discSortKey];
    }
    return cmp * dir;
  });

  // Reload the GSC list when a preset range is chosen (custom waits for Apply).
  // Skip the first run — init() already loads the default range.
  const rangeMounted = useRef(false);
  useEffect(() => {
    if (!rangeMounted.current) { rangeMounted.current = true; return; }
    if (range !== "custom") loadDiscovered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const DiscSortHead = ({ column, label, className }: { column: DiscKey; label: string; className?: string }) => (
    <button
      onClick={() => toggleDiscSort(column)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className || ""}`}
    >
      {label}
      {discSortKey === column ? (
        discSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  const addKeyword = async (query: string, tags: string[], folderId?: string | null) => {
    const q = query.trim();
    if (!q) return;
    await fetch("/api/keywords/tracked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, tags, folderId: folderId ?? null }),
    });
    await Promise.all([loadTracked(), loadFolders()]);
    fetch("/api/keywords/snapshot", { method: "POST" }).then((r) => (r.ok ? loadTracked() : null)).catch(() => {});
  };

  const handleAddManual = async () => {
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
    // If a folder filter is active, default new keyword into it.
    const folderId = newFolderForKeyword || (activeFolder && activeFolder !== "none" ? activeFolder : null);
    await addKeyword(newKeyword, tags, folderId);
    setNewKeyword("");
    setNewTags("");
    setNewFolderForKeyword("");
  };

  const untrack = async (id: string) => {
    await fetch(`/api/keywords/tracked/${id}`, { method: "DELETE" });
    loadTracked();
  };

  const saveTags = async (id: string) => {
    const tags = tagDraft.split(",").map((t) => t.trim()).filter(Boolean);
    await fetch(`/api/keywords/tracked/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    setEditingTagsFor(null);
    setTagDraft("");
    loadTracked();
  };

  const handleConnect = async () => {
    const res = await fetch("/api/gsc/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Keywords</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!gscConnected) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Keywords</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Google Search Console</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Connect GSC to track keyword rankings over time.
            </p>
            <Button onClick={handleConnect} size="lg">Connect Now</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Keywords</h1>
        <p className="text-muted-foreground mt-1">Tag and track keyword rankings over time</p>
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {/* Add keyword */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Track a keyword</CardTitle>
          <CardDescription>Add a keyword and optional comma-separated tags. We&apos;ll snapshot its rank each time you visit.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="e.g. plumber near me"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
              className="max-w-xs"
            />
            <Input
              placeholder="tags: brand, local"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
              className="max-w-xs"
            />
            <select
              value={newFolderForKeyword}
              onChange={(e) => setNewFolderForKeyword(e.target.value)}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground h-10"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <Button onClick={handleAddManual} disabled={!newKeyword.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracked keywords */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tracked Keywords</CardTitle>
          <CardDescription>{tracked.length} tracked</CardDescription>

          {/* Folders */}
          <div className="flex flex-wrap gap-2 items-center pt-3">
            <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
              <FolderIcon className="h-3.5 w-3.5" /> Folders:
            </span>
            <button onClick={() => setActiveFolder(null)}>
              <Badge variant={activeFolder === null ? "default" : "outline"} className="cursor-pointer">All</Badge>
            </button>
            {folders.map((f) => (
              <span key={f.id} className="inline-flex items-center group">
                <button onClick={() => setActiveFolder(f.id === activeFolder ? null : f.id)}>
                  <Badge variant={activeFolder === f.id ? "default" : "outline"} className="cursor-pointer">
                    {f.name}{typeof f.count === "number" ? ` (${f.count})` : ""}
                  </Badge>
                </button>
                <button
                  onClick={() => deleteFolder(f.id)}
                  title="Delete folder"
                  className="ml-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={() => setActiveFolder(activeFolder === "none" ? null : "none")}>
              <Badge variant={activeFolder === "none" ? "default" : "outline"} className="cursor-pointer">Uncategorized</Badge>
            </button>
            <div className="inline-flex items-center gap-1 ml-2">
              <Input
                placeholder="New folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                className="h-7 text-xs w-32"
              />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={createFolder} disabled={!newFolderName.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center pt-2">
              <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Tags:
              </span>
              <button onClick={() => setActiveTag(null)}>
                <Badge variant={activeTag === null ? "default" : "outline"} className="cursor-pointer">All</Badge>
              </button>
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setActiveTag(tag === activeTag ? null : tag)}>
                  <Badge variant={activeTag === tag ? "default" : "outline"} className="cursor-pointer">
                    {tag}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {visibleTracked.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {tracked.length === 0 ? "No keywords tracked yet. Add one above or track from the list below." : "No keywords with this tag."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHead column="query" label="Keyword" /></TableHead>
                  <TableHead><SortHead column="folder" label="Folder" /></TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right"><SortHead column="position" label="Position" className="justify-end" /></TableHead>
                  <TableHead className="text-right"><SortHead column="change" label="Change" className="justify-end" /></TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTracked.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.query}</TableCell>
                    <TableCell>
                      <select
                        value={kw.folderId || ""}
                        onChange={(e) => moveToFolder(kw.id, e.target.value || null)}
                        className="border border-input rounded-md px-2 py-1 text-xs bg-background text-foreground max-w-[150px]"
                      >
                        <option value="">No folder</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {editingTagsFor === kw.id ? (
                        <div className="flex gap-1 items-center">
                          <Input
                            autoFocus
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveTags(kw.id)}
                            placeholder="comma, separated"
                            className="h-7 text-xs max-w-[160px]"
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => saveTags(kw.id)}>Save</Button>
                        </div>
                      ) : (
                        <button
                          className="flex flex-wrap gap-1 items-center text-left"
                          onClick={() => { setEditingTagsFor(kw.id); setTagDraft(kw.tags.join(", ")); }}
                        >
                          {kw.tags.length ? (
                            kw.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)
                          ) : (
                            <span className="text-muted-foreground text-xs inline-flex items-center gap-1"><Tag className="h-3 w-3" />add tags</span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {kw.latest ? <PositionBadge pos={kw.latest.position} /> : <span className="text-muted-foreground text-xs">pending</span>}
                    </TableCell>
                    <TableCell className="text-right"><Change change={kw.change} /></TableCell>
                    <TableCell><Sparkline history={kw.history} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => untrack(kw.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Discovered keywords from GSC */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>From Search Console</CardTitle>
              <CardDescription>Your top queries ({rangeLabel}) with position vs. the prior period — click Track to start monitoring</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground h-9"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {range === "custom" && (
                <div className="flex items-center gap-1">
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-[140px] text-sm" />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-[140px] text-sm" />
                  <Button size="sm" className="h-9" onClick={loadDiscovered} disabled={!customStart || !customEnd}>Apply</Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {discovered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No keyword data available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><DiscSortHead column="query" label="Query" /></TableHead>
                  <TableHead className="text-right"><DiscSortHead column="clicks" label="Clicks" className="justify-end" /></TableHead>
                  <TableHead className="text-right"><DiscSortHead column="impressions" label="Impressions" className="justify-end" /></TableHead>
                  <TableHead className="text-right"><DiscSortHead column="ctr" label="CTR" className="justify-end" /></TableHead>
                  <TableHead className="text-right">Previous</TableHead>
                  <TableHead className="text-right"><DiscSortHead column="position" label="Current" className="justify-end" /></TableHead>
                  <TableHead className="text-right"><DiscSortHead column="positionChange" label="Change" className="justify-end" /></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDiscovered.map((kw, i) => {
                  const isTracked = trackedQueries.has(kw.query.toLowerCase());
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{kw.query}</TableCell>
                      <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(kw.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        {kw.prevPosition !== null ? <span className="text-muted-foreground text-sm">#{kw.prevPosition.toFixed(1)}</span> : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right"><PositionBadge pos={kw.position} /></TableCell>
                      <TableCell className="text-right"><Change change={kw.positionChange} /></TableCell>
                      <TableCell className="text-right">
                        {isTracked ? (
                          <Badge variant="secondary" className="text-xs">Tracking</Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => addKeyword(kw.query, [])}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Track
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
