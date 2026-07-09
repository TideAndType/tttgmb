"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, CheckCircle2, AlertTriangle, XCircle, MapPin, ChevronDown, ChevronRight } from "lucide-react";

interface Check { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string; fix?: string; }
interface LocalItem { title: string; status: "good" | "todo"; suggestion: string; }
interface Result { scanUrl: string; score: number; checks: Check[]; local: LocalItem[]; gbpConnected: boolean; }

const statusIcon = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-red-600" />,
};

export default function SeoScanPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const scan = async () => {
    setScanning(true); setError("");
    const r = await fetch("/api/marketing/seo/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Scan failed.");
    else setResult(d);
    setScanning(false);
  };

  const scoreColor = (n: number) => n >= 75 ? "text-green-600" : n >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Search className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">SEO &amp; Local Scanner</h1>
            <p className="text-sm text-muted-foreground">Technical SEO checks on your site plus a local SEO checklist, with AI fixes.</p>
          </div>
        </div>
        <Button size="sm" onClick={scan} disabled={scanning}>
          {scanning ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
          {scanning ? "Scanning…" : "Run scan"}
        </Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error} {error.includes("No website") && <Link href="/marketing/setup" className="underline">Add it →</Link>}</div>}

      {!result ? (
        !scanning && <Card><CardContent className="py-12 text-center text-muted-foreground"><Search className="h-8 w-8 mx-auto mb-2 opacity-40" />Run a scan to check your technical + local SEO.</CardContent></Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}</p>
              <p className="text-xs text-muted-foreground">SEO score</p>
            </div>
            <p className="text-xs text-muted-foreground">Scanned {result.scanUrl}</p>
          </div>

          {/* Technical checks */}
          <Card>
            <CardHeader><CardTitle className="text-base">Technical SEO</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {result.checks.map((c) => (
                <div key={c.id} className="border-b border-border last:border-0 py-2">
                  <div className="flex items-center gap-2">
                    {statusIcon[c.status]}
                    <span className="text-sm font-medium text-foreground flex-1">{c.label}</span>
                    <span className="text-xs text-muted-foreground">{c.detail}</span>
                    {c.fix && (
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
                        {expanded === c.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Fix
                      </button>
                    )}
                  </div>
                  {c.fix && expanded === c.id && <p className="text-sm text-foreground/80 whitespace-pre-wrap border-l-2 border-border pl-3 ml-6 mt-1">{c.fix}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Local SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Local SEO</CardTitle>
              {!result.gbpConnected && <p className="text-xs text-amber-600">Google Business Profile isn&apos;t connected — connect it for live local data.</p>}
            </CardHeader>
            <CardContent className="space-y-2">
              {result.local.length === 0 ? (
                <p className="text-sm text-muted-foreground">No local checklist available (AI may not be configured).</p>
              ) : result.local.map((l, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-border last:border-0 py-2">
                  {l.status === "good" ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.suggestion}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
