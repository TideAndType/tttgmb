"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, ArrowLeft, Search } from "lucide-react";

interface Article { id: string; title: string; category: string | null; body: string; }

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [active, setActive] = useState<Article | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/kb").then((r) => r.json()).then((d) => setArticles(d.articles || []));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? articles.filter((a) => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s)) : articles;
  }, [articles, q]);

  const byCategory = useMemo(() => {
    const m: Record<string, Article[]> = {};
    for (const a of filtered) {
      const k = a.category || "General";
      (m[k] ||= []).push(a);
    }
    return m;
  }, [filtered]);

  if (active) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setActive(null)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> All articles
        </button>
        {active.category && <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{active.category}</p>}
        <h1 className="text-3xl font-bold text-foreground mb-4">{active.title}</h1>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{active.body}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Guides and answers to common questions</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No articles found.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h2>
              <div className="space-y-2">
                {list.map((a) => (
                  <button key={a.id} onClick={() => setActive(a)} className="w-full text-left">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="py-3">
                        <p className="font-medium text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
