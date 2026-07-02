"use client";

import { useEffect, useState } from "react";
import { ConnectionBadge } from "@/components/integrations/connection-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CombinedChart } from "@/components/charts/combined-chart";
import { AiExplain } from "@/components/ai/ai-explain";
import {
  BarChart2,
  Search,
  MousePointerClick,
  Eye,
  TrendingUp,
  Users,
  FileText,
  Timer,
  UserPlus,
  Activity,
  MapPin,
  Globe,
  Phone,
  Navigation,
} from "lucide-react";

type RangeKey = "30d" | "90d" | "120d" | "thisYear" | "lastYear" | "custom";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "120d", label: "Last 120 days" },
  { value: "thisYear", label: "This year" },
  { value: "lastYear", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

interface GaMetrics {
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
}

interface GaTimeSeries {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

interface GscTotals {
  clicks: number;
  impressions: number;
  avgPosition: number;
  avgCtr: number;
}

interface GscRow {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

interface GaProperty {
  name: string;
  displayName: string;
}

interface GmbMetrics {
  totalImpressions: number;
  websiteClicks: number;
  callClicks: number;
  directionRequests: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReportsPage() {
  const [gaConnected, setGaConnected] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);
  const [gmbConnected, setGmbConnected] = useState(false);
  const [gmbMetrics, setGmbMetrics] = useState<GmbMetrics | null>(null);
  const [gaPropertySet, setGaPropertySet] = useState(false);
  const [gaMetrics, setGaMetrics] = useState<GaMetrics | null>(null);
  const [gaTimeSeries, setGaTimeSeries] = useState<GaTimeSeries[]>([]);
  const [gscTotals, setGscTotals] = useState<GscTotals | null>(null);
  const [gscRows, setGscRows] = useState<GscRow[]>([]);
  const [properties, setProperties] = useState<GaProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [range, setRange] = useState<RangeKey>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const rangeParams = () => {
    const p = new URLSearchParams({ range });
    if (range === "custom" && customStart && customEnd) {
      p.set("start", customStart);
      p.set("end", customEnd);
    }
    return p.toString();
  };

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ga_connected") === "true") {
      loadGaProperties();
    }
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadGaData(), loadGscData(), loadGmbData()]);
    setLoading(false);
  };

  const loadGaData = async () => {
    const res = await fetch(`/api/ga/data?${rangeParams()}`);
    if (res.status === 400) {
      const d = await res.json();
      if (d.error === "GA not connected") {
        setGaConnected(false);
        return;
      }
      if (d.error === "GA property not selected") {
        setGaConnected(true);
        setGaPropertySet(false);
        loadGaProperties();
        return;
      }
    }
    if (!res.ok) return;
    const data = await res.json();
    setGaConnected(true);
    setGaPropertySet(true);
    setGaMetrics(data.metrics);
    setGaTimeSeries(data.timeSeries);
  };

  const loadGscData = async () => {
    const res = await fetch(`/api/gsc/data?${rangeParams()}`);
    if (!res.ok) {
      setGscConnected(false);
      return;
    }
    const data = await res.json();
    setGscConnected(true);
    setGscTotals(data.totals);
    setGscRows(data.rows || []);
  };

  const loadGmbData = async () => {
    const res = await fetch("/api/gmb/data");
    if (!res.ok) {
      setGmbConnected(false);
      return;
    }
    const data = await res.json();
    setGmbConnected(true);
    setGmbMetrics(data.metrics);
  };

  const loadGaProperties = async () => {
    const res = await fetch("/api/ga/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data.properties || []);
    }
  };

  const handleConnectGa = async () => {
    const res = await fetch("/api/ga/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleConnectGsc = async () => {
    const res = await fetch("/api/gsc/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleConnectGmb = async () => {
    const res = await fetch("/api/gmb/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleSaveProperty = async () => {
    if (!selectedProperty) return;
    setSavingProperty(true);
    const res = await fetch("/api/ga/property", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: selectedProperty }),
    });
    if (res.ok) {
      setGaPropertySet(true);
      loadGaData();
    } else {
      setError("Failed to save property selection.");
    }
    setSavingProperty(false);
  };

  // Merge timeseries for combined chart (last 30 days)
  const chartData = (() => {
    const map: Record<string, { date: string; gaSessions?: number; gscClicks?: number }> = {};
    gaTimeSeries.forEach((row) => {
      map[row.date] = { ...map[row.date], date: row.date, gaSessions: row.sessions };
    });
    gscRows.forEach((row) => {
      map[row.date] = { ...map[row.date], date: row.date, gscClicks: row.clicks };
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Reports</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Live stats from Google Analytics &amp; Search Console</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              <Button size="sm" className="h-9" onClick={loadAll} disabled={!customStart || !customEnd}>Apply</Button>
            </div>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {(gaMetrics || gscTotals || gmbMetrics) && (
        <div className="mb-8">
          <AiExplain reportType={`Combined marketing report (Analytics, Search Console, Business Profile) — ${RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "last 30 days"}`} data={{ analytics: gaMetrics, searchConsole: gscTotals, businessProfile: gmbMetrics }} />
        </div>
      )}

      {/* Connection banners */}
      <div className="flex flex-wrap gap-3 mb-8">
        {!gaConnected && (
          <Button onClick={handleConnectGa} variant="outline" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Connect Google Analytics
          </Button>
        )}
        {gaConnected && !gaPropertySet && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">GA4 — select property</Badge>
        )}
        {gaConnected && gaPropertySet && (
          <ConnectionBadge service="ga" label="Google Analytics" onDisconnected={() => setGaConnected(false)} />
        )}
        {!gscConnected && (
          <Button onClick={handleConnectGsc} variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Connect Search Console
          </Button>
        )}
        {gscConnected && (
          <ConnectionBadge service="gsc" label="Google Search Console" onDisconnected={() => setGscConnected(false)} />
        )}
        {!gmbConnected && (
          <Button onClick={handleConnectGmb} variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            Connect Google My Business
          </Button>
        )}
        {gmbConnected && (
          <ConnectionBadge service="gmb" label="Google Business Profile" onDisconnected={() => setGmbConnected(false)} />
        )}
      </div>

      {/* Property selector */}
      {gaConnected && !gaPropertySet && properties.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Select a GA4 Property</CardTitle>
            <CardDescription>Choose which property to pull data from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap items-center">
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[260px]"
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                <option value="">— Select property —</option>
                {properties.map((p) => (
                  <option key={p.name} value={p.name}>{p.displayName} ({p.name})</option>
                ))}
              </select>
              <Button onClick={handleSaveProperty} disabled={!selectedProperty || savingProperty}>
                {savingProperty ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GA4 stats */}
      {gaMetrics && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Google Analytics 4</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Activity} label="Sessions" value={gaMetrics.sessions.toLocaleString()} />
            <StatCard icon={Users} label="Users" value={gaMetrics.users.toLocaleString()} />
            <StatCard icon={FileText} label="Pageviews" value={gaMetrics.pageviews.toLocaleString()} />
            <StatCard icon={TrendingUp} label="Bounce Rate" value={`${(gaMetrics.bounceRate * 100).toFixed(1)}%`} />
            <StatCard icon={Timer} label="Avg. Session" value={formatDuration(gaMetrics.avgSessionDuration)} />
            <StatCard icon={UserPlus} label="New Users" value={gaMetrics.newUsers.toLocaleString()} />
          </div>
        </>
      )}

      {/* GSC stats */}
      {gscTotals && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Google Search Console</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={MousePointerClick} label="Clicks" value={gscTotals.clicks.toLocaleString()} />
            <StatCard icon={Eye} label="Impressions" value={gscTotals.impressions.toLocaleString()} />
            <StatCard icon={TrendingUp} label="Avg CTR" value={`${(gscTotals.avgCtr * 100).toFixed(2)}%`} />
            <StatCard icon={Search} label="Avg Position" value={gscTotals.avgPosition.toFixed(1)} />
          </div>
        </>
      )}

      {/* GMB stats */}
      {gmbMetrics && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Google My Business</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Eye} label="Total Impressions" value={gmbMetrics.totalImpressions.toLocaleString()} />
            <StatCard icon={Globe} label="Website Clicks" value={gmbMetrics.websiteClicks.toLocaleString()} />
            <StatCard icon={Phone} label="Call Clicks" value={gmbMetrics.callClicks.toLocaleString()} />
            <StatCard icon={Navigation} label="Direction Requests" value={gmbMetrics.directionRequests.toLocaleString()} />
          </div>
        </>
      )}

      {/* Combined chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>GSC clicks vs GA4 sessions — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <CombinedChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Empty state when neither connected */}
      {!gaConnected && !gscConnected && !gmbConnected && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <BarChart2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect your analytics</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Connect Google Analytics 4 and/or Google Search Console to see live performance stats.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button onClick={handleConnectGa}>Connect GA4</Button>
              <Button variant="outline" onClick={handleConnectGsc}>Connect Search Console</Button>
              <Button variant="outline" onClick={handleConnectGmb}>Connect My Business</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
