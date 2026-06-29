"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, RefreshCw, Download, Plus, ChevronRight, Key, Check, AlertCircle, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Project {
  id: string;
  name: string;
  url?: string;
  activePlatforms?: string[];
}

interface VisibilityScore {
  brand: string;
  isOwn?: boolean;
  visibilityScore?: number;
  shareOfVoice?: number;
  sentiment?: string;
  avgRank?: number;
  platforms?: Record<string, number>;
}

interface RunStatus {
  status: "pending" | "running" | "completed" | "failed";
  runId: string;
  progress?: number;
}

// ---------------------------------------------------------------------------
// Proxy helper
// ---------------------------------------------------------------------------
async function olFetch(path: string, method = "GET", body?: object, params?: Record<string, string>) {
  const res = await fetch("/api/openlens/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, method, body, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `OpenLens error ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Normalize a brand score — OpenLens field names vary, so accept variants and
// scale 0–1 fractions to percentages.
// ---------------------------------------------------------------------------
function num(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}
// Map an OpenLens VisibilityScore (overall, avgPosition, byPlatform, isOwn,
// dominantSentiment) onto the page's shape. Fallbacks keep older/variant names working.
function normalizeScore(r: any): VisibilityScore {
  return {
    brand: r.brandName ?? r.brand ?? r.name ?? r.label ?? "—",
    isOwn: r.isOwn ?? false,
    visibilityScore: num(r.overall ?? r.visibilityScore ?? r.visibility ?? r.mentionRate ?? r.score),
    sentiment: r.dominantSentiment ?? r.sentiment ?? r.sentimentLabel,
    avgRank: num(r.avgPosition ?? r.avgRank ?? r.averageRank ?? r.rank),
    platforms: r.byPlatform ?? r.platforms ?? r.platformBreakdown,
  };
}

// OpenLens has no share-of-voice field — derive it as each brand's share of the
// total mention rate across all brands in the run.
function withShareOfVoice(scores: VisibilityScore[]): VisibilityScore[] {
  const total = scores.reduce((sum, s) => sum + (s.visibilityScore ?? 0), 0);
  return scores.map((s) => ({
    ...s,
    shareOfVoice: total > 0 ? ((s.visibilityScore ?? 0) / total) * 100 : 0,
  }));
}

// ---------------------------------------------------------------------------
// Adaptive engine-insights normalizer. The response shape isn't pinned, so
// coerce array-of-engines or object-keyed-by-platform into a uniform list.
// ---------------------------------------------------------------------------
function toEngineList(data: any): { name: string; entries: [string, any][] }[] {
  if (!data) return [];
  const raw = Array.isArray(data) ? data : data.engines ?? data.platforms ?? data.data ?? data;
  let items: { name: string; obj: any }[] = [];
  if (Array.isArray(raw)) {
    items = raw.map((r: any, i: number) => ({
      name: (r.platform ?? r.engine ?? r.platformId ?? r.name ?? `Engine ${i + 1}`).toString().replace("_app", ""),
      obj: r,
    }));
  } else if (raw && typeof raw === "object") {
    items = Object.entries(raw).map(([k, v]) => ({
      name: k.replace("_app", ""),
      obj: v && typeof v === "object" ? v : { value: v },
    }));
  }
  return items.map(({ name, obj }) => ({
    name,
    entries: Object.entries(obj).filter(([k]) => !["platform", "engine", "platformId", "name"].includes(k)),
  }));
}

function fmtVal(v: any): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  return String(v);
}

function labelize(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()).trim();
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    running: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// API Key setup card
// ---------------------------------------------------------------------------
function ApiKeyCard({ onSaved }: { onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!key.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/profile/openlens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch {
      setErr("Could not save key. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto gap-6">
      <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
        <Key className="w-6 h-6 text-violet-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Connect OpenLens</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your OpenLens API key to track AI visibility scores across ChatGPT, Perplexity, Google AI Overviews, and DeepSeek.
        </p>
        <a href="https://tryopenlens.com" target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline mt-1 inline-block">
          Get an API key at tryopenlens.com →
        </a>
      </div>
      <div className="w-full space-y-3">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-openlens-…"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {err && <p className="text-xs text-red-500">{err}</p>}
        <Button onClick={save} disabled={saving || !key.trim()} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Save API Key
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboard modal
// ---------------------------------------------------------------------------
function OnboardModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"idle" | "analyzing" | "review" | "confirming" | "done">("idle");
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");

  async function analyze() {
    if (!url.trim()) return;
    setStep("analyzing");
    setError("");
    try {
      const data = await olFetch("/onboard", "POST", { action: "analyze", url: url.trim() });
      setAnalysis(data.data ?? data);
      setStep("review");
    } catch (e: any) {
      setError(e.message);
      setStep("idle");
    }
  }

  async function confirm() {
    setStep("confirming");
    setError("");
    try {
      const data = await olFetch("/onboard", "POST", {
        action: "confirm",
        brandName: analysis.brandName,
        url: url.trim(),
        industryType: analysis.industryType,
        location: analysis.location,
        languages: analysis.languages,
        competitors: analysis.competitors,
        topicList: analysis.topics ?? analysis.keywords,
        activePlatforms: ["chatgpt_app", "perplexity_app", "google_app", "deepseek"],
        promptsPerTopic: 10,
      });
      const projectId = data.data?.projectId ?? data.projectId;
      setStep("done");
      setTimeout(() => onCreated(projectId), 800);
    } catch (e: any) {
      setError(e.message);
      setStep("review");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Onboard New Brand</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {(step === "idle" || step === "analyzing") && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="https://yourbrand.com"
                disabled={step === "analyzing"}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-400">OpenLens will research the brand, propose competitors, and generate topics. Takes ~30 seconds.</p>
              <Button onClick={analyze} disabled={step === "analyzing" || !url.trim()} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                {step === "analyzing" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing…</> : "Analyze Brand"}
              </Button>
            </div>
          )}

          {(step === "review" || step === "confirming") && analysis && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Brand</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{analysis.brandName}</p>
                <p className="text-sm text-gray-500">{analysis.industryType} · {analysis.location}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Competitors</p>
                <div className="flex flex-wrap gap-1">
                  {(analysis.competitors || []).map((c: string) => (
                    <span key={c} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Topics</p>
                <ul className="space-y-1">
                  {(analysis.topics ?? analysis.keywords ?? []).slice(0, 5).map((t: string) => (
                    <li key={t} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1"><ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("idle")} disabled={step === "confirming"} className="flex-1">Back</Button>
                <Button onClick={confirm} disabled={step === "confirming"} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                  {step === "confirming" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating…</> : "Create Project"}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Project created!</p>
              <p className="text-sm text-gray-500 mt-1">Prompts are generating in the background. Run a scan once ready.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visibility panel
// ---------------------------------------------------------------------------
function VisibilityPanel({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [scores, setScores] = useState<VisibilityScore[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [showSearches, setShowSearches] = useState(false);
  const [rawScores, setRawScores] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  const fetchTopics = useCallback(async () => {
    try {
      const data = await olFetch("/visibility", "GET", undefined, { projectId, type: "topics" });
      const arr = Array.isArray(data) ? data : data.topics ?? data.data ?? [];
      const mapped = (Array.isArray(arr) ? arr : [])
        .map((t: any) => ({ id: t.topicId ?? t.id ?? "", name: t.topic ?? t.name ?? t.title ?? t.topicName ?? "Topic" }))
        .filter((t: any) => t.id);
      // De-dupe by id (per-topic summaries can repeat across platforms).
      const seen = new Set<string>();
      setTopics(mapped.filter((t: any) => (seen.has(t.id) ? false : (seen.add(t.id), true))));
    } catch {
      setTopics([]);
    }
  }, [projectId]);

  const fetchInsight = useCallback(async (topicId: string) => {
    if (!topicId) { setInsight(""); return; }
    setInsightLoading(true);
    setInsightError("");
    setInsight("");
    try {
      const data = await olFetch("/insights/topic", "GET", undefined, { projectId, topicId });
      setInsight(data.insight ?? "");
    } catch (e: any) {
      // 404 = no usable run / unknown topic; show a friendly note rather than an error.
      setInsightError(/404/.test(e.message || "") ? "No insight available for this topic yet — run a scan first." : e.message);
    } finally {
      setInsightLoading(false);
    }
  }, [projectId]);

  const [mentions, setMentions] = useState<any[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [mentionsError, setMentionsError] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  const fetchMentions = useCallback(async () => {
    setMentionsLoading(true);
    setMentionsError("");
    try {
      const data = await olFetch("/brand-mentions-summary", "GET", undefined, { projectId, limit: "20" });
      const arr = Array.isArray(data) ? data : data.topics ?? data.data ?? [];
      setMentions(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      setMentionsError(e.message);
    } finally {
      setMentionsLoading(false);
    }
  }, [projectId]);

  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");
  const [showSources, setShowSources] = useState(false);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError("");
    try {
      const data = await olFetch("/sources", "GET", undefined, { projectId, limit: "20", urlsPerDomain: "10" });
      const arr = Array.isArray(data) ? data : data.sources ?? data.domains ?? data.data ?? [];
      setSources(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      setSourcesError(e.message);
    } finally {
      setSourcesLoading(false);
    }
  }, [projectId]);

  const [engines, setEngines] = useState<any>(null);
  const [enginesLoading, setEnginesLoading] = useState(false);
  const [enginesError, setEnginesError] = useState("");
  const [showEngines, setShowEngines] = useState(false);

  const fetchEngines = useCallback(async () => {
    setEnginesLoading(true);
    setEnginesError("");
    try {
      const data = await olFetch("/insights/engines", "GET", undefined, { projectId });
      setEngines(data);
    } catch (e: any) {
      setEnginesError(e.message);
    } finally {
      setEnginesLoading(false);
    }
  }, [projectId]);

  const [trendSeries, setTrendSeries] = useState<any[]>([]);
  const [trendSummary, setTrendSummary] = useState<{ currentScore: number; previousScore: number; changePercent: number; trend: string } | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      const data = await olFetch("/visibility/trends", "GET", undefined, { projectId, days: "30" });
      const series = (data.series ?? []).map((p: any) => ({
        date: p.date,
        score: typeof p.visibilityScore === "number" ? p.visibilityScore : null,
      }));
      setTrendSeries(series);
      setTrendSummary(data.summary ?? null);
    } catch {
      // Trends are supplementary — don't surface as a blocking error.
      setTrendSeries([]);
      setTrendSummary(null);
    }
  }, [projectId]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    setResultsError("");
    try {
      const data = await olFetch("/prompts/results", "GET", undefined, { projectId });
      const arr = Array.isArray(data) ? data : data.results ?? data.prompts ?? data.data ?? [];
      setResults(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      setResultsError(e.message);
    } finally {
      setResultsLoading(false);
    }
  }, [projectId]);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await olFetch("/visibility", "GET", undefined, { projectId, type: "overview" });
      setRawScores(data);
      const arr = Array.isArray(data) ? data : data.scores ?? data.brands ?? data.data ?? [];
      setScores(withShareOfVoice((Array.isArray(arr) ? arr : []).map(normalizeScore)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchScores(); fetchTrends(); fetchTopics(); }, [fetchScores, fetchTrends, fetchTopics]);

  // Auto-select the first topic and load its insight.
  useEffect(() => {
    if (topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0].id);
      fetchInsight(topics[0].id);
    }
  }, [topics, selectedTopic, fetchInsight]);

  // Poll run status
  useEffect(() => {
    if (!runStatus || runStatus.status === "completed" || runStatus.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const data = await olFetch("/prompts/status", "GET", undefined, { projectId, runId: runStatus.runId });
        setRunStatus((prev) => prev ? { ...prev, status: data.status, progress: data.progress } : null);
        if (data.status === "completed") {
          clearInterval(t);
          fetchScores();
          fetchTrends();
          fetchTopics();
          if (selectedTopic) fetchInsight(selectedTopic);
        }
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, [runStatus, projectId, fetchScores, fetchTrends, fetchTopics, fetchInsight, selectedTopic]);

  async function startScan() {
    setRunLoading(true);
    setError("");
    try {
      const data = await olFetch("/prompts/run", "POST", { projectId });
      setRunStatus({ status: "running", runId: data.runId });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunLoading(false);
    }
  }

  // Resolve the latest run id — the PDF report endpoint requires one.
  async function latestRunId(): Promise<string | null> {
    if (runStatus?.runId) return runStatus.runId;
    try {
      const data = await olFetch("/reports/runs", "GET", undefined, { projectId });
      const runs: any[] = Array.isArray(data) ? data : data.runs ?? data.data ?? [];
      // Prefer the most recent completed run; fall back to the most recent of any status.
      const completed = runs.find((r) => r.status === "completed") ?? runs[0];
      return completed ? (completed.id ?? completed.runId ?? null) : null;
    } catch {
      return null;
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    setError("");
    try {
      const runId = await latestRunId();
      if (!runId) throw new Error("No completed run found to build a report. Run a scan first.");
      const res = await fetch("/api/openlens/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/reports/visibility", method: "GET", params: { projectId, runId } }),
      });
      if (!res.ok) throw new Error("Failed to download report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "visibility-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  const myBrand = scores.find((s) => s.isOwn) ?? scores[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          ← All Projects
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">PDF Report</span>
          </Button>
          <Button size="sm" onClick={startScan} disabled={runLoading || (runStatus?.status === "running")} className="bg-violet-600 hover:bg-violet-700 text-white">
            {runLoading || runStatus?.status === "running"
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Scanning…</>
              : <><RefreshCw className="w-4 h-4 mr-1.5" />Run Scan</>}
          </Button>
        </div>
      </div>

      {runStatus && (
        <div className="flex items-center gap-3 text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          {runStatus.status === "running" ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Check className="w-4 h-4 text-green-600" />}
          <span className="text-blue-700 dark:text-blue-300">
            {runStatus.status === "running" ? "Scan in progress — AI platforms are responding. Scores update when complete (5–15 min)." : "Scan complete."}
          </span>
          <StatusPill status={runStatus.status} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading scores…
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          <Eye className="w-8 h-8 mx-auto mb-3 opacity-30" />
          No visibility data yet. Run a scan to get scores.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero card for primary brand */}
          {myBrand && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Visibility Score", value: myBrand.visibilityScore != null ? `${myBrand.visibilityScore.toFixed(1)}%` : "—" },
                { label: "Share of Voice", value: myBrand.shareOfVoice != null ? `${myBrand.shareOfVoice.toFixed(1)}%` : "—" },
                { label: "Sentiment", value: myBrand.sentiment ?? "—" },
                { label: "Avg. Rank", value: myBrand.avgRank != null ? `#${myBrand.avgRank.toFixed(1)}` : "—" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Visibility trend over time */}
          {trendSeries.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Visibility Trend</CardTitle>
                  <CardDescription className="text-xs">Visibility score over the last 30 days</CardDescription>
                </div>
                {trendSummary && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {trendSummary.currentScore != null ? `${trendSummary.currentScore.toFixed(1)}%` : "—"}
                    </p>
                    <p className={`text-xs font-medium inline-flex items-center gap-1 ${
                      trendSummary.trend === "up" ? "text-green-600" : trendSummary.trend === "down" ? "text-red-600" : "text-gray-400"
                    }`}>
                      {trendSummary.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : trendSummary.trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      {trendSummary.changePercent != null ? `${trendSummary.changePercent > 0 ? "+" : ""}${trendSummary.changePercent.toFixed(1)}%` : ""}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: any) => (typeof v === "number" ? `${v.toFixed(1)}%` : v)} />
                    <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={false} name="Visibility" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* AI-generated insight per topic */}
          {topics.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">AI Insight</CardTitle>
                  <CardDescription className="text-xs">An actionable takeaway for the selected topic</CardDescription>
                </div>
                <select
                  value={selectedTopic}
                  onChange={(e) => { setSelectedTopic(e.target.value); fetchInsight(e.target.value); }}
                  className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-900 max-w-[220px]"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </CardHeader>
              <CardContent>
                {insightLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating insight…
                  </div>
                ) : insightError ? (
                  <p className="text-sm text-gray-400">{insightError}</p>
                ) : insight ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
                ) : (
                  <p className="text-sm text-gray-400">Select a topic to see its insight.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competitor comparison table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Share of Voice vs Competitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scores.map((s) => {
                  const pct = s.shareOfVoice ?? s.visibilityScore ?? 0;
                  const max = Math.max(...scores.map((x) => x.shareOfVoice ?? x.visibilityScore ?? 0), 1);
                  return (
                    <div key={s.brand}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{s.brand}</span>
                        <span className="text-gray-500">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${(pct / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-platform breakdown */}
          {myBrand?.platforms && Object.keys(myBrand.platforms).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Platform Breakdown</CardTitle>
                <CardDescription className="text-xs">Visibility score per AI platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(myBrand.platforms).map(([platform, score]) => (
                    <div key={platform} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1 capitalize">{platform.replace("_app", "")}</p>
                      <p className="text-lg font-bold text-violet-600">{typeof score === "number" ? `${score.toFixed(1)}%` : "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Raw data — diagnostic so we can see exactly what OpenLens returns */}
      {rawScores != null && (
        <div className="text-xs">
          <button onClick={() => setShowRaw((s) => !s)} className="text-gray-400 hover:text-gray-600 underline">
            {showRaw ? "Hide" : "Show"} raw visibility data
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-gray-900 text-gray-100 p-3 text-[11px] leading-relaxed">
              {JSON.stringify(rawScores, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Searches & rankings — the actual prompts run against each AI platform */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Searches &amp; Rankings</CardTitle>
            <CardDescription className="text-xs">The prompts run against each AI platform and how your brand ranked</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const next = !showSearches; setShowSearches(next); if (next && results.length === 0) fetchResults(); }}
          >
            {showSearches ? "Hide" : "View searches"}
          </Button>
        </CardHeader>
        {showSearches && (
          <CardContent>
            {resultsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading searches…
              </div>
            ) : resultsError ? (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {resultsError}
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No search results yet. Run a scan first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2 pr-3 font-medium">Search / Prompt</th>
                      <th className="py-2 px-3 font-medium">Platform</th>
                      <th className="py-2 px-3 font-medium text-center">Mentioned</th>
                      <th className="py-2 pl-3 font-medium text-right">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any, i: number) => {
                      const prompt = r.prompt ?? r.query ?? r.text ?? r.promptText ?? "—";
                      const platform = (r.platform ?? r.engine ?? r.platformId ?? "—").toString().replace("_app", "");
                      const rank = r.rank ?? r.position ?? r.brandRank ?? null;
                      const mentioned = r.mentioned ?? r.brandMentioned ?? (rank != null && rank > 0);
                      return (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 align-top">
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 max-w-md">{prompt}</td>
                          <td className="py-2 px-3 text-gray-500 capitalize whitespace-nowrap">{platform}</td>
                          <td className="py-2 px-3 text-center">
                            {mentioned
                              ? <Check className="w-4 h-4 text-green-600 inline" />
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 pl-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            {rank != null && rank > 0 ? `#${rank}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Brand mentions — topics where the own brand was cited, with source URLs */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Brand Mentions</CardTitle>
            <CardDescription className="text-xs">Top topics where your brand was mentioned, with the URLs cited</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const next = !showMentions; setShowMentions(next); if (next && mentions.length === 0) fetchMentions(); }}
          >
            {showMentions ? "Hide" : "View mentions"}
          </Button>
        </CardHeader>
        {showMentions && (
          <CardContent>
            {mentionsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading mentions…
              </div>
            ) : mentionsError ? (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {mentionsError}
              </div>
            ) : mentions.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No brand mentions yet. Run a scan first.</p>
            ) : (
              <div className="space-y-4">
                {mentions.map((m: any) => (
                  <div key={m.topicId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{m.topicName}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(m.platforms ?? []).map((p: string) => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300 capitalize">
                              {p.replace("_app", "")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-xs text-gray-500">
                        <p><span className="font-semibold text-gray-800 dark:text-gray-200">{m.count}</span> mentions</p>
                        {m.bestPosition != null && <p>Best #{m.bestPosition}</p>}
                        {m.dominantSentiment && <p className="capitalize">{m.dominantSentiment}</p>}
                      </div>
                    </div>
                    {(m.urls ?? []).length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {m.urls.map((u: any, i: number) => (
                          <li key={i} className="flex items-center justify-between gap-3 text-xs">
                            <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline truncate" title={u.url}>
                              {u.title || u.domain || u.url}
                            </a>
                            <span className="text-gray-400 shrink-0">{u.domain}{u.count > 1 ? ` · ${u.count}×` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Top cited domains for the latest run */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Top Cited Domains</CardTitle>
            <CardDescription className="text-xs">Sources the AI platforms cited most in this run</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const next = !showSources; setShowSources(next); if (next && sources.length === 0) fetchSources(); }}
          >
            {showSources ? "Hide" : "View sources"}
          </Button>
        </CardHeader>
        {showSources && (
          <CardContent>
            {sourcesLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sources…
              </div>
            ) : sourcesError ? (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {sourcesError}
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No citation sources yet. Run a scan first.</p>
            ) : (
              <div className="space-y-3">
                {sources.map((s: any, i: number) => {
                  const domain = s.domain ?? s.name ?? s.host ?? "—";
                  const count = s.count ?? s.citations ?? s.citationCount ?? s.total;
                  const category = s.category ?? s.type;
                  const urls = s.urls ?? s.pages ?? s.links ?? [];
                  return (
                    <div key={domain + i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{domain}</span>
                          {category && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-[11px] text-violet-700 dark:text-violet-300 capitalize shrink-0">
                              {String(category).replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        {count != null && (
                          <span className="text-xs text-gray-500 shrink-0"><span className="font-semibold text-gray-800 dark:text-gray-200">{count}</span> citations</span>
                        )}
                      </div>
                      {Array.isArray(urls) && urls.length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {urls.map((u: any, j: number) => {
                            const href = typeof u === "string" ? u : u.url ?? u.link;
                            const title = typeof u === "string" ? u : u.title || href;
                            const uCount = typeof u === "object" ? u.count : undefined;
                            return (
                              <li key={j} className="flex items-center justify-between gap-3 text-xs">
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline truncate" title={href}>
                                  {title}
                                </a>
                                {uCount != null && uCount > 1 && <span className="text-gray-400 shrink-0">{uCount}×</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Engine insights — per-platform source behavior for the latest run */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Engine Insights</CardTitle>
            <CardDescription className="text-xs">How each AI platform sources and surfaces answers</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const next = !showEngines; setShowEngines(next); if (next && engines == null) fetchEngines(); }}
          >
            {showEngines ? "Hide" : "View insights"}
          </Button>
        </CardHeader>
        {showEngines && (
          <CardContent>
            {enginesLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading insights…
              </div>
            ) : enginesError ? (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {enginesError}
              </div>
            ) : toEngineList(engines).length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No engine insights yet. Run a scan first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {toEngineList(engines).map((eng) => (
                  <div key={eng.name} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 capitalize mb-2">{eng.name}</p>
                    <dl className="space-y-1">
                      {eng.entries.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 text-xs">
                          <dt className="text-gray-500">{labelize(k)}</dt>
                          <dd className="text-gray-800 dark:text-gray-200 text-right">{fmtVal(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AiVisibilityPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [changingKey, setChangingKey] = useState(false);
  const [projectsError, setProjectsError] = useState("");

  async function checkKey() {
    const res = await fetch("/api/profile/openlens");
    const data = await res.json();
    setHasKey(data.hasKey);
    setMaskedKey(data.maskedKey);
  }

  async function fetchProjects() {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const data = await olFetch("/projects", "GET");
      setProjects(Array.isArray(data) ? data : data.projects ?? []);
    } catch (e: any) {
      setProjects([]);
      setProjectsError(e.message || "Couldn't load projects from OpenLens.");
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => { checkKey(); }, []);
  useEffect(() => { if (hasKey) fetchProjects(); }, [hasKey]);

  if (hasKey === null) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }

  if (!hasKey || changingKey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ApiKeyCard onSaved={() => { setChangingKey(false); checkKey(); }} />
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <VisibilityPanel projectId={selectedProject} onBack={() => setSelectedProject(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {onboarding && (
        <OnboardModal
          onClose={() => setOnboarding(false)}
          onCreated={(id) => { setOnboarding(false); fetchProjects(); setSelectedProject(id); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Visibility</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your brand across ChatGPT, Perplexity, Google AI Overviews, and DeepSeek.</p>
        </div>
        <Button onClick={() => setOnboarding(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Brand
        </Button>
      </div>

      {/* Key management */}
      <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
        <span>API Key: <span className="font-mono">{maskedKey}</span></span>
        <button onClick={() => setChangingKey(true)} className="text-violet-600 hover:underline">Change key</button>
      </div>

      {projectsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {projectsError}
        </div>
      )}

      {/* Projects list */}
      {projectsLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Eye className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">No projects yet</p>
          <p className="text-sm text-gray-400 mb-4">Onboard your first brand to start tracking AI visibility.</p>
          <Button onClick={() => setOnboarding(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Onboard a Brand
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-left group"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-400">{p.name}</p>
                {p.url && <p className="text-xs text-gray-400 mt-0.5">{p.url}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
