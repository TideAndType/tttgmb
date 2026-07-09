"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Sparkles, RefreshCw, Copy, Check, Trash2, FileText } from "lucide-react";

interface Content { id: string; type: string; title: string; body: string; status: string; createdAt: string; }

const TYPES: { value: string; label: string }[] = [
  { value: "blog", label: "Blog post" },
  { value: "facebook", label: "Facebook post" },
  { value: "instagram", label: "Instagram caption" },
  { value: "linkedin", label: "LinkedIn post" },
  { value: "gbp", label: "Google Business post" },
  { value: "email", label: "Email newsletter" },
  { value: "landing", label: "Landing page" },
  { value: "service", label: "Service page" },
  { value: "faq", label: "FAQ set" },
  { value: "video", label: "Video / Reel script" },
];

export default function ContentStudioPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [type, setType] = useState("blog");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = async () => {
    const d = await fetch("/api/marketing/content").then((r) => r.json());
    setItems(d.content ?? []);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setError("");
    const r = await fetch("/api/marketing/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, topic }) });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Couldn't generate content.");
    else { setItems((prev) => [d.content, ...prev]); setTopic(""); }
    setBusy(false);
  };

  const setStatus = async (id: string, status: string) => {
    setItems((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    await fetch(`/api/marketing/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  };
  const remove = async (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/marketing/content/${id}`, { method: "DELETE" });
  };
  const copy = async (c: Content) => {
    try { await navigator.clipboard.writeText(c.body); setCopied(c.id); setTimeout(() => setCopied(""), 2000); } catch { /* ignore */ }
  };

  const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Studio</h1>
          <p className="text-sm text-muted-foreground">AI-generated content in your brand voice.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Generate content</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground h-10">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="Topic or brief, e.g. '5 tips for spring HVAC maintenance'" className="flex-1 min-w-[220px]" />
            <Button onClick={generate} disabled={busy || !topic.trim()}>
              {busy ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />} Generate
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No content yet. Generate your first piece above.</p>
        ) : items.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabel(c.type)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "published" ? "bg-green-500/10 text-green-600" : c.status === "approved" ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                </div>
                <CardTitle className="text-base mt-1 truncate">{c.title}</CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => copy(c)} title="Copy">{copied === c.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}</Button>
                {c.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "approved")}>Approve</Button>}
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-80 overflow-y-auto">
                <RichTextContent text={c.body} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
