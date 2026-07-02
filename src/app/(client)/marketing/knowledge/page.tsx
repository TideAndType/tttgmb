"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Plus, Trash2, Upload, FileText } from "lucide-react";

interface Doc { id: string; name: string; createdAt: string; chars: number; preview: string; }

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const d = await fetch("/api/marketing/knowledge").then((r) => r.json());
    setDocs(d.docs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 1_000_000) { setError("File is too large (max ~1MB of text)."); return; }
    const text = await file.text();
    setName((n) => n || file.name.replace(/\.(txt|md|markdown)$/i, ""));
    setContent(text);
    setAdding(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true); setError("");
    const r = await fetch("/api/marketing/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, content }) });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setError(d.error || "Couldn't save."); return; }
    setDocs((prev) => [d.doc, ...prev]);
    setName(""); setContent(""); setAdding(false);
    if (d.truncated) setError("Note: the document was long and was truncated to ~40,000 characters.");
  };

  const remove = async (id: string) => {
    setDocs((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/marketing/knowledge/${id}`, { method: "DELETE" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Brand guides, service docs, case studies — the AI uses these when writing content and answering questions.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".txt,.md,.markdown,text/plain" onChange={onFile} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1.5" /> Upload .txt/.md</Button>
          <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4 mr-1.5" /> Add document</Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm px-3 py-2">{error}</div>}

      {adding && (
        <Card>
          <CardHeader><CardTitle className="text-base">New document</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Document name, e.g. 'Brand voice guide'" />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Paste your content here…" />
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !name.trim() || !content.trim()}>{saving ? "Saving…" : "Save document"}</Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setName(""); setContent(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : docs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />No documents yet. Add a brand guide, service doc, or FAQ so the AI knows your business.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.chars.toLocaleString()} chars · added {new Date(d.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{d.preview}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Tip: for PDFs or Word docs, copy the text and paste it in — plain text and Markdown work best.</p>
    </div>
  );
}
