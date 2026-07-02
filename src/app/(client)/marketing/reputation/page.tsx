"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Sparkles, RefreshCw, Trash2, Plus, Copy, Check, Mail } from "lucide-react";

interface Review { id: string; author: string; rating: number; text: string | null; source: string; response: string | null; reviewedAt: string; }
interface Stats { total: number; avg: number; distribution: { star: number; count: number }[]; needsResponse: number; }

function Stars({ n }: { n: number }) {
  return <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}</span>;
}

export default function ReputationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ author: "", rating: 5, text: "", source: "google" });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [requestMsg, setRequestMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const d = await fetch("/api/marketing/reviews").then((r) => r.json());
    setReviews(d.reviews ?? []);
    setStats(d.stats ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.author.trim()) return;
    const r = await fetch("/api/marketing/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { setForm({ author: "", rating: 5, text: "", source: "google" }); setAdding(false); load(); }
  };

  const draft = async (id: string) => {
    setBusy(id); setError("");
    const r = await fetch(`/api/marketing/reviews/${id}/respond`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't draft a response.");
    else setDrafts((prev) => ({ ...prev, [id]: d.draft }));
    setBusy("");
  };

  const saveResponse = async (id: string) => {
    const response = drafts[id];
    await fetch(`/api/marketing/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, response } : r));
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const remove = async (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/marketing/reviews/${id}`, { method: "DELETE" });
  };

  const genRequest = async () => {
    setBusy("request"); setError("");
    const r = await fetch("/api/marketing/reviews/request", { method: "POST" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate a request.");
    else setRequestMsg(d.message);
    setBusy("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Star className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reputation</h1>
            <p className="text-sm text-muted-foreground">Track reviews, draft AI responses, and request more.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={genRequest} disabled={busy === "request"}>
            {busy === "request" ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />} Review request
          </Button>
          <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4 mr-1.5" /> Add review</Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      {requestMsg && (
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Review-request message</p>
            <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(requestMsg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}</Button>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{requestMsg}</p>
        </CardContent></Card>
      )}

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
          <Card><CardContent className="py-4 px-8 text-center">
            <p className="text-4xl font-bold text-foreground">{stats.avg}</p>
            <Stars n={Math.round(stats.avg)} />
            <p className="text-xs text-muted-foreground mt-1">{stats.total} reviews · {stats.needsResponse} need a reply</p>
          </CardContent></Card>
          <Card><CardContent className="py-4 space-y-1">
            {stats.distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{d.star}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} /></div>
                <span className="w-6 text-right text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}

      {adding && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} placeholder="Reviewer name" className="max-w-xs" />
            <select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} className="border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
            </select>
            <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
              {["google", "facebook", "yelp", "manual"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Review text (optional)" rows={2} />
          <Button onClick={add} disabled={!form.author.trim()}>Add review</Button>
        </CardContent></Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Star className="h-8 w-8 mx-auto mb-2 opacity-40" />No reviews yet. Add one to start tracking your reputation.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <div className="flex items-center gap-2"><span className="font-medium text-foreground">{r.author}</span><Stars n={r.rating} /><span className="text-xs text-muted-foreground capitalize">· {r.source}</span></div>
                  {r.text && <p className="text-sm text-foreground/80 mt-1">{r.text}</p>}
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="pt-0">
                {r.response ? (
                  <div className="rounded-md bg-muted/40 border border-border p-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Your response</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.response}</p>
                    <button onClick={() => draft(r.id)} className="text-xs text-primary hover:underline mt-1">Redraft with AI</button>
                  </div>
                ) : drafts[r.id] !== undefined ? (
                  <div className="space-y-2">
                    <Textarea value={drafts[r.id]} onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: e.target.value }))} rows={3} />
                    <div className="flex gap-2"><Button size="sm" onClick={() => saveResponse(r.id)}>Save response</Button><Button size="sm" variant="ghost" onClick={() => setDrafts((p) => { const n = { ...p }; delete n[r.id]; return n; })}>Cancel</Button></div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => draft(r.id)} disabled={busy === r.id}>
                    {busy === r.id ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Draft AI response
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
