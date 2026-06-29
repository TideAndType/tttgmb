"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Search, Plus, X, TrendingUp, TrendingDown, Minus, Tag } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

interface TrackedKeyword {
  id: string;
  query: string;
  tags: string[];
  latest: { date: string; position: number; clicks: number; impressions: number; ctr: number } | null;
  change: number | null;
  history: { date: string; position: number }[];
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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    await loadTracked();
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

  const loadDiscovered = async () => {
    try {
      const res = await fetch("/api/gsc/data?type=keywords");
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

  const visibleTracked = activeTag
    ? tracked.filter((t) => t.tags.includes(activeTag))
    : tracked;

  const addKeyword = async (query: string, tags: string[]) => {
    const q = query.trim();
    if (!q) return;
    await fetch("/api/keywords/tracked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, tags }),
    });
    await loadTracked();
    fetch("/api/keywords/snapshot", { method: "POST" }).then((r) => (r.ok ? loadTracked() : null)).catch(() => {});
  };

  const handleAddManual = async () => {
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
    await addKeyword(newKeyword, tags);
    setNewKeyword("");
    setNewTags("");
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
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
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
                  <TableHead>Keyword</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTracked.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.query}</TableCell>
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
          <CardTitle>From Search Console</CardTitle>
          <CardDescription>Your top queries (last 90 days) — click Track to start monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          {discovered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No keyword data available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discovered.map((kw, i) => {
                  const isTracked = trackedQueries.has(kw.query.toLowerCase());
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{kw.query}</TableCell>
                      <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(kw.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right"><PositionBadge pos={kw.position} /></TableCell>
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
