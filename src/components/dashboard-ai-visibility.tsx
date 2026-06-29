"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Score {
  brand: string;
  isOwn?: boolean;
  visibilityScore?: number;
  shareOfVoice?: number;
  sentiment?: string;
  avgRank?: number;
}

function num(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// Map OpenLens VisibilityScore (overall/avgPosition/brandName/isOwn) and derive
// share of voice from each brand's share of total mention rate.
function normalize(rows: any[]): Score[] {
  const mapped = rows.map((r) => ({
    brand: r.brandName ?? r.brand ?? r.name ?? "—",
    isOwn: r.isOwn ?? false,
    visibilityScore: num(r.overall ?? r.visibilityScore ?? r.visibility ?? r.score),
    sentiment: r.dominantSentiment ?? r.sentiment,
    avgRank: num(r.avgPosition ?? r.avgRank ?? r.averageRank),
  }));
  const total = mapped.reduce((s, m) => s + (m.visibilityScore ?? 0), 0);
  return mapped.map((m) => ({ ...m, shareOfVoice: total > 0 ? ((m.visibilityScore ?? 0) / total) * 100 : 0 }));
}

async function proxy(path: string, method = "GET", params?: Record<string, string>) {
  const res = await fetch("/api/openlens/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, method, params }),
  });
  if (!res.ok) throw new Error("proxy error");
  return res.json();
}

export function AiVisibilityWidget() {
  const [state, setState] = useState<"loading" | "no-key" | "no-projects" | "loaded" | "error" | "idle">("loading");
  const [scores, setScores] = useState<Score[]>([]);
  const [projectName, setProjectName] = useState("");

  // Only check the (internal) key on mount — never auto-hit the OpenLens API.
  useEffect(() => {
    (async () => {
      try {
        const keyData = await fetch("/api/profile/openlens").then((r) => r.json());
        setState(keyData.hasKey ? "idle" : "no-key");
      } catch {
        setState("error");
      }
    })();
  }, []);

  const loadData = async () => {
    setState("loading");
    try {
      const projects = await proxy("/projects").then((d) => Array.isArray(d) ? d : d.projects ?? []);
      if (!projects.length) { setState("no-projects"); return; }
      const first = projects[0];
      setProjectName(first.name);
      const vis = await proxy("/visibility", "GET", { projectId: first.id, type: "overview" });
      const list = Array.isArray(vis) ? vis : vis.scores ?? vis.brands ?? vis.data ?? [];
      setScores(normalize(Array.isArray(list) ? list : []));
      setState("loaded");
    } catch {
      setState("error");
    }
  };

  const myBrand = scores.find((s) => s.isOwn) ?? scores[0];
  // Own brand first, then the rest by share of voice.
  const ranked = [...scores].sort((a, b) =>
    (b.isOwn ? 1 : 0) - (a.isOwn ? 1 : 0) || (b.shareOfVoice ?? 0) - (a.shareOfVoice ?? 0)
  );
  const maxSov = Math.max(...scores.map((s) => s.shareOfVoice ?? s.visibilityScore ?? 0), 1);

  if (state === "no-key") {
    return (
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10">
        <CardContent className="py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Eye className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Visibility</p>
              <p className="text-xs text-gray-500">Connect your OpenLens account to track AI search presence.</p>
            </div>
          </div>
          <Link href="/ai-visibility" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5 shrink-0">
            Connect <ChevronRight className="w-3 h-3" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (state === "idle") {
    return (
      <Card>
        <CardContent className="py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Eye className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Visibility</p>
              <p className="text-xs text-gray-500">Loaded on demand to save your API quota.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Load
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "loading") {
    return (
      <Card>
        <CardContent className="py-5 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading AI visibility…
        </CardContent>
      </Card>
    );
  }

  if (state === "no-projects" || state === "error") return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-600" />
            <CardTitle className="text-base font-semibold">AI Visibility</CardTitle>
            {projectName && <span className="text-xs text-muted-foreground">· {projectName}</span>}
          </div>
          <Link href="/ai-visibility" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
            Full view <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero metrics */}
        {myBrand && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Visibility</p>
              <p className="text-xl font-bold text-violet-700 dark:text-violet-400">
                {myBrand.visibilityScore != null ? `${myBrand.visibilityScore.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Share of Voice</p>
              <p className="text-xl font-bold text-violet-700 dark:text-violet-400">
                {myBrand.shareOfVoice != null ? `${myBrand.shareOfVoice.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Rank</p>
              <p className="text-xl font-bold text-violet-700 dark:text-violet-400">
                {myBrand.avgRank != null ? `#${myBrand.avgRank.toFixed(1)}` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Competitor bars */}
        {scores.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share of Voice</p>
            {ranked.slice(0, 5).map((s, i) => {
              const pct = s.shareOfVoice ?? s.visibilityScore ?? 0;
              return (
                <div key={s.brand}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={`font-medium ${s.isOwn ? "text-violet-700 dark:text-violet-400" : "text-muted-foreground"}`}>{s.brand}</span>
                    <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.isOwn ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      style={{ width: `${(pct / maxSov) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
