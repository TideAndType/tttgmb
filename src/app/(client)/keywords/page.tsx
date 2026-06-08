"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Search } from "lucide-react";

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/gsc/data?type=keywords");
      if (res.status === 400 || res.status === 401) {
        setGscConnected(false);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to load keywords");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (e) {
      setError("Failed to load keyword data");
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    const res = await fetch("/api/gsc/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const getPositionBadge = (pos: number) => {
    if (pos <= 3) return <Badge variant="default">Top 3</Badge>;
    if (pos <= 10) return <Badge variant="secondary">Top 10</Badge>;
    return <Badge variant="outline">#{Math.round(pos)}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Keywords</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Keywords</h1>
        <p className="text-muted-foreground mt-1">Keyword rankings from Google Search Console (last 90 days)</p>
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
              Connect GSC to view your keyword rankings and search performance data.
            </p>
            <Button onClick={handleConnect} size="lg">Connect Now</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Rankings</CardTitle>
            <CardDescription>{keywords.length} keywords tracked</CardDescription>
          </CardHeader>
          <CardContent>
            {keywords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No keyword data available yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((kw, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{kw.query}</TableCell>
                      <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(kw.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{getPositionBadge(kw.position)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
