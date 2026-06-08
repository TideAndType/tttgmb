"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SeoChart } from "@/components/charts/seo-chart";
import { Search, TrendingUp, Eye, MousePointerClick } from "lucide-react";

interface SeoData {
  rows: Array<{
    date: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
  totals: {
    clicks: number;
    impressions: number;
    avgPosition: number;
    avgCtr: number;
  };
}

export default function SeoPage() {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gsc/data");
      if (res.status === 401) {
        setGscConnected(false);
        setLoading(false);
        return;
      }
      if (res.status === 400) {
        setGscConnected(false);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to load data");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setGscConnected(true);
    } catch (e) {
      setError("Failed to load GSC data");
    }
    setLoading(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SEO Overview</h1>
          <p className="text-muted-foreground mt-1">Last 90 days performance from Google Search Console</p>
        </div>
        {!gscConnected && (
          <Button onClick={handleConnect}>
            <Search className="h-4 w-4 mr-2" />
            Connect Google Search Console
          </Button>
        )}
        {gscConnected && (
          <Badge variant="default">GSC Connected</Badge>
        )}
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {!gscConnected ? (
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Clicks, impressions, and average position over the last 90 days</CardDescription>
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
