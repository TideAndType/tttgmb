"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Trash2, Pencil, Plus } from "lucide-react";

interface Article { id: string; title: string; category: string | null; body: string; published: boolean; }

const EMPTY = { id: "", title: "", category: "", body: "", published: true };

export default function AdminKbPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/kb");
    if (res.ok) setArticles((await res.json()).articles || []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(EMPTY); setEditing(true); };
  const startEdit = (a: Article) => { setForm({ id: a.id, title: a.title, category: a.category || "", body: a.body, published: a.published }); setEditing(true); };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    const payload = { title: form.title, category: form.category, body: form.body, published: form.published };
    const res = form.id
      ? await fetch(`/api/kb/${form.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/kb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setEditing(false); setForm(EMPTY); load(); }
  };

  const remove = async (id: string) => {
    await fetch(`/api/kb/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Help articles your clients can read</p>
          </div>
        </div>
        {!editing && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1.5" />New article</Button>}
      </div>

      {editing && (
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-base">{form.id ? "Edit article" : "New article"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="t">Title</Label>
              <Input id="t" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c">Category (optional)</Label>
              <Input id="c" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Getting Started" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="b">Body</Label>
              <textarea id="b" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={10} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-y" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="h-4 w-4 accent-primary" />
              Published (visible to clients)
            </label>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !form.title.trim() || !form.body.trim()}>{saving ? "Saving…" : "Save"}</Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(EMPTY); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No articles yet.</p>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{a.title}</p>
                    {a.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.category}</span>}
                    {!a.published && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">Draft</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
