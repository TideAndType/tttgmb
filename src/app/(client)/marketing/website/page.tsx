"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, RefreshCw, CheckCircle2, X, ChevronDown, ChevronRight } from "lucide-react";

interface Rec {
  id: string; category: string; title: string; impact: string; difficulty: string;
  reason: string; solution: string; status: string; scanUrl: string | null;
}

const catColor: Record<string, string> = {
  seo: "bg-violet-500/10 text-violet-600", ux: "bg-blue-500/10 text-blue-600",
  conversion: "bg-green-500/10 text-green-600", cta: "bg-amber-500/10 text-amber-600",
  accessibility: "bg-cyan-500/10 text-cyan-600", content: "bg-pink-500/10 text-pink-600",
  newpage: "bg-indigo-500/10 text-indigo-600", performance: "bg-red-500/10 text-red-600",
};
const impactColor: Record<string, string> = { high: "text-red-600", medium: "text-amber-600", low: "text-blue-600" };

export default function WebsiteAdvisorPage() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [lastScan, setLastScan] = useState<{ at: string; url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const d = await fetch("/api/marketing/website").then((r) => r.json());
    setRecs(d.recommendations ?? []);
    setLastScan(d.lastScan ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true); setError("");
    const r = await fetch("/api/marketing/website/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Scan failed.");
    else load();
    setScanning(false);
  };

  const setStatus = async (id: string, status: string) => {
    setRecs((prev) => status === "dismissed" ? prev.filter((r) => r.id !== id) : prev.map((r) => r.id === id ? { ...r, status } : r));
    await fetch(`/api/marketing/website/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  };

  const open = recs.filter((r) => r.status === "open");
  const done = recs.filter((r) => r.status === "done");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Website Growth Advisor</h1>
            <p className="text-sm text-muted-foreground">AI scans your site and recommends the highest-impact improvements.</p>
          </div>
        </div>
        <Button size="sm" onClick={scan} disabled={scanning}>
          {scanning ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
          {scanning ? "Scanning…" : "Scan my website"}
        </Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error} {error.includes("No website") && <Link href="/marketing/setup" className="underline">Add it →</Link>}</div>}
      {lastScan && <p className="text-xs text-muted-foreground">Last scan: {lastScan.url} · {new Date(lastScan.at).toLocaleString()}</p>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : open.length === 0 && done.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />No scan yet. Click <strong>Scan my website</strong> for AI recommendations.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {[...open, ...done].map((r) => (
            <Card key={r.id} className={r.status === "done" ? "opacity-60" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => setStatus(r.id, r.status === "done" ? "open" : "done")} className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-600">
                    <CheckCircle2 className={`h-5 w-5 ${r.status === "done" ? "text-green-600" : ""}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${catColor[r.category] || "bg-muted text-muted-foreground"}`}>{r.category}</span>
                      <p className={`text-sm font-medium ${r.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className={impactColor[r.impact]}>{r.impact} impact</span> · {r.difficulty} to do
                    </p>
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1">
                      {expanded === r.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Why &amp; how
                    </button>
                    {expanded === r.id && (
                      <div className="mt-1.5 space-y-2 border-l-2 border-border pl-3">
                        <div><p className="text-[11px] font-semibold text-muted-foreground uppercase">Why it matters</p><p className="text-sm text-foreground/85">{r.reason}</p></div>
                        <div><p className="text-[11px] font-semibold text-muted-foreground uppercase">How to fix it</p><p className="text-sm text-foreground/85 whitespace-pre-wrap">{r.solution}</p></div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setStatus(r.id, "dismissed")} className="text-muted-foreground hover:text-destructive shrink-0" title="Dismiss"><X className="h-4 w-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
