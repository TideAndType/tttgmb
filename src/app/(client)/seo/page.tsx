"use client";

import { useEffect, useState } from "react";
import { ConnectionBadge } from "@/components/integrations/connection-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SeoChart } from "@/components/charts/seo-chart";
import { AiExplain } from "@/components/ai/ai-explain";
import { Search, TrendingUp, TrendingDown, Eye, MousePointerClick, Minus } from "lucide-react";

interface Totals {
  clicks: number;
  impressions: number;
  avgPosition: number;
  avgCtr: number;
}

interface SeoData {
  rows: Array<{
    date: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
  totals: Totals;
  prevTotals?: Totals;
  rangeLabel?: string;
}

type RangeKey = "30d" | "90d" | "120d" | "thisYear" | "lastYear" | "custom";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "120d", label: "Last 120 days" },
  { value: "thisYear", label: "This year" },
  { value: "lastYear", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

// Period-over-period delta. `lowerIsBetter` flips the color for avg position
// (a smaller number is a better rank).
function Delta({ current, previous, lowerIsBetter = false, percent = false }: { current: number; previous?: number; lowerIsBetter?: boolean; percent?: boolean }) {
  if (previous === undefined || previous === 0) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><Minus className="h-3 w-3" />0%</span>;
  }
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const pct = ((diff / previous) * 100);
  const label = percent
    ? `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(2)}pts`
    : `${diff > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${improved ? "text-green-600" : "text-red-600"}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

export default function SeoPage() {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);
  const [propertySet, setPropertySet] = useState(false);
  const [sites, setSites] = useState<{ siteUrl: string }[]>([]);
  const [savingSite, setSavingSite] = useState(false);
  const [error, setError] = useState("");

  const [range, setRange] = useState<RangeKey>("90d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    // Custom range waits for the Apply button.
    if (range === "custom" && (!customStart || !customEnd)) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range });
      if (range === "custom" && customStart && customEnd) {
        params.set("start", customStart);
        params.set("end", customEnd);
      }
      const res = await fetch(`/api/gsc/data?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setGscConnected(true);
        setPropertySet(true);
        setLoading(false);
        return;
      }
      // Distinguish "not connected" from "connected but no property selected".
      const d = await res.json().catch(() => ({}));
      const msg = (d && d.error) || "";
      if (res.status === 400 && /property/i.test(msg)) {
        setGscConnected(true);
        setPropertySet(false);
        await loadSites();
      } else {
        setGscConnected(false);
        setPropertySet(false);
      }
    } catch (e) {
      setError("Failed to load GSC data");
    }
    setLoading(false);
  };

  const [sitesError, setSitesError] = useState("");
  const loadSites = async () => {
    setSitesError("");
    const res = await fetch("/api/gsc/properties");
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setSites(Array.isArray(d.sites) ? d.sites : []);
    } else {
      setSitesError(d.error || "Couldn't read Search Console sites.");
    }
  };

  const pickSite = async (siteUrl: string) => {
    setSavingSite(true);
    const res = await fetch("/api/gsc/property", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl }),
    });
    setSavingSite(false);
    if (res.ok) fetchData();
  };

  const handleConnect = async () => {
    const res = await fetch("/api/gsc/connect");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SEO Overview</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SEO Overview</h1>
          <p className="text-muted-foreground mt-1">{data?.rangeLabel ? `Performance for ${data.rangeLabel}` : "Performance"} from Google Search Console</p>
        </div>
        {!gscConnected && (
          <Button onClick={handleConnect}>
            <Search className="h-4 w-4 mr-2" />
            Connect Google Search Console
          </Button>
        )}
        {gscConnected && (
          <ConnectionBadge service="gsc" label="Google Search Console" onDisconnected={fetchData} />
        )}
      </div>

      {gscConnected && propertySet && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground h-9"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {range === "custom" && (
            <div className="flex items-center gap-1">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border border-input rounded-md px-2 py-1.5 text-sm bg-background text-foreground h-9" />
              <span className="text-muted-foreground text-sm">–</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border border-input rounded-md px-2 py-1.5 text-sm bg-background text-foreground h-9" />
              <Button size="sm" className="h-9" onClick={fetchData} disabled={!customStart || !customEnd}>Apply</Button>
            </div>
          )}
          <span className="text-xs text-muted-foreground">vs. previous period</span>
        </div>
      )}

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {gscConnected && !propertySet ? (
        <Card>
          <CardContent className="py-10">
            <h3 className="text-lg font-semibold mb-1">Select a Search Console property</h3>
            <p className="text-muted-foreground text-sm mb-5">Connected ✓ — now choose which verified site to pull data from.</p>
            {sitesError ? (
              <Alert variant="destructive" className="text-sm">{sitesError}</Alert>
            ) : sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Search Console properties found on the Google account you connected. Make sure you authorized with the Google account that has access to the site in Search Console — and that the Search Console site is verified.</p>
            ) : (
              <div className="space-y-2 max-w-md">
                {sites.map((s) => (
                  <button
                    key={s.siteUrl}
                    onClick={() => pickSite(s.siteUrl)}
                    disabled={savingSite}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {s.siteUrl}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : !gscConnected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Google Search Console</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Connect your GSC account to view clicks, impressions, and average position data for the last 90 days.
            </p>
            <Button onClick={handleConnect} size="lg">
              Connect Now
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4" />
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.clicks.toLocaleString()}</p>
                <Delta current={data.totals.clicks} previous={data.prevTotals?.clicks} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.impressions.toLocaleString()}</p>
                <Delta current={data.totals.impressions} previous={data.prevTotals?.impressions} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.avgPosition.toFixed(1)}</p>
                <Delta current={data.totals.avgPosition} previous={data.prevTotals?.avgPosition} lowerIsBetter />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg CTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(data.totals.avgCtr * 100).toFixed(2)}%</p>
                <Delta current={data.totals.avgCtr} previous={data.prevTotals?.avgCtr} percent />
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <AiExplain reportType={`Google Search Console — ${data.rangeLabel || "last 90 days"}`} data={data.totals} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Clicks, impressions, and average position over {data.rangeLabel || "the last 90 days"}</CardDescription>
            </CardHeader>
            <CardContent>
              <SeoChart data={data.rows} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
