"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionBadge } from "@/components/integrations/connection-badge";
import { Search, BarChart2, MapPin, Eye, CalendarDays, Plug, CheckCircle2, Copy, Check, ExternalLink } from "lucide-react";

interface Status {
  connections: {
    gsc: { connected: boolean; propertySet: boolean };
    ga: { connected: boolean; propertySet: boolean };
    gmb: { connected: boolean; accountSet: boolean; locationSet: boolean };
  };
}

export default function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [gscSites, setGscSites] = useState<{ siteUrl: string }[]>([]);
  const [gaProps, setGaProps] = useState<{ id?: string; propertyId?: string; displayName?: string; name?: string }[]>([]);
  const [openLens, setOpenLens] = useState<{ hasKey: boolean; maskedKey: string | null }>({ hasKey: false, maskedKey: null });
  const [keyInput, setKeyInput] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    const d = await fetch("/api/integrations/status").then((r) => r.json());
    setStatus(d);
    if (d.connections?.gsc.connected && !d.connections.gsc.propertySet) fetch("/api/gsc/properties").then((r) => r.json()).then((x) => setGscSites(x.sites ?? [])).catch(() => {});
    if (d.connections?.ga.connected && !d.connections.ga.propertySet) fetch("/api/ga/properties").then((r) => r.json()).then((x) => setGaProps(x.properties ?? [])).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      loadStatus(),
      fetch("/api/profile/openlens").then((r) => r.json()).then(setOpenLens).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const connect = async (service: "gsc" | "ga" | "gmb") => {
    const d = await fetch(`/api/${service}/connect`).then((r) => r.json());
    if (d.url) window.location.href = d.url;
  };
  const pickGscSite = async (siteUrl: string) => { await fetch("/api/gsc/property", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl }) }); loadStatus(); };
  const pickGaProp = async (propertyId: string) => { await fetch("/api/ga/property", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId }) }); loadStatus(); };

  const saveKey = async () => {
    setSavingKey(true);
    await fetch("/api/profile/openlens", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: keyInput }) });
    const d = await fetch("/api/profile/openlens").then((r) => r.json());
    setOpenLens(d); setKeyInput(""); setSavingKey(false);
  };

  const getIcal = async () => {
    const d = await fetch("/api/calendar/ical-token").then((r) => r.json());
    if (d.url) setIcalUrl(d.url);
  };

  if (loading) return <div className="max-w-2xl mx-auto"><p className="text-muted-foreground">Loading…</p></div>;

  const c = status?.connections;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Plug className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings &amp; Connections</h1>
          <p className="text-sm text-muted-foreground">Connect your data sources so your reports and AI stay in sync.</p>
        </div>
      </div>

      {/* Google Search Console */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Google Search Console</CardTitle>
            {c?.gsc.connected ? <ConnectionBadge service="gsc" label="Google Search Console" onDisconnected={loadStatus} /> : <Button size="sm" onClick={() => connect("gsc")}>Connect</Button>}
          </div>
          <CardDescription>Search rankings, clicks, and impressions.</CardDescription>
        </CardHeader>
        {c?.gsc.connected && !c.gsc.propertySet && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Choose which verified site to pull data from:</p>
            <div className="space-y-1.5">
              {gscSites.length === 0 ? <p className="text-sm text-muted-foreground">No verified sites found on the connected Google account.</p> :
                gscSites.map((s) => <button key={s.siteUrl} onClick={() => pickGscSite(s.siteUrl)} className="w-full text-left px-3 py-2 rounded-md border border-border hover:border-primary hover:bg-accent text-sm">{s.siteUrl}</button>)}
            </div>
          </CardContent>
        )}
        {c?.gsc.propertySet && <CardContent><p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Property selected and syncing.</p></CardContent>}
      </Card>

      {/* Google Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Google Analytics (GA4)</CardTitle>
            {c?.ga.connected ? <ConnectionBadge service="ga" label="Google Analytics" onDisconnected={loadStatus} /> : <Button size="sm" onClick={() => connect("ga")}>Connect</Button>}
          </div>
          <CardDescription>Website traffic, sessions, and engagement.</CardDescription>
        </CardHeader>
        {c?.ga.connected && !c.ga.propertySet && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Choose your GA4 property:</p>
            <div className="space-y-1.5">
              {gaProps.length === 0 ? <p className="text-sm text-muted-foreground">No GA4 properties found.</p> :
                gaProps.map((p) => { const id = p.propertyId || p.id || ""; return <button key={id} onClick={() => pickGaProp(id)} className="w-full text-left px-3 py-2 rounded-md border border-border hover:border-primary hover:bg-accent text-sm">{p.displayName || p.name || id}</button>; })}
            </div>
          </CardContent>
        )}
        {c?.ga.propertySet && <CardContent><p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Property selected and syncing.</p></CardContent>}
      </Card>

      {/* Google Business Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Google Business Profile</CardTitle>
            {c?.gmb.connected ? <ConnectionBadge service="gmb" label="Google Business Profile" onDisconnected={loadStatus} /> : <Button size="sm" onClick={() => connect("gmb")}>Connect</Button>}
          </div>
          <CardDescription>Local listing, reviews, and map performance.</CardDescription>
        </CardHeader>
        {c?.gmb.connected && (
          <CardContent>
            {c.gmb.locationSet ? <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Location selected and syncing.</p> :
              <Link href="/gmb" className="text-sm text-primary hover:underline inline-flex items-center gap-1">Choose your business location <ExternalLink className="h-3.5 w-3.5" /></Link>}
          </CardContent>
        )}
      </Card>

      {/* OpenLens / AI Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> AI Visibility (OpenLens)</CardTitle>
          <CardDescription>Track how your brand shows up across AI answer engines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {openLens.hasKey && <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Key saved ({openLens.maskedKey})</p>}
          <div className="flex gap-2">
            <Input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={openLens.hasKey ? "Enter a new key to replace" : "Paste your OpenLens API key"} type="password" className="flex-1" />
            <Button onClick={saveKey} disabled={savingKey || !keyInput.trim()}>{savingKey ? "Saving…" : "Save"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Calendar Subscription</CardTitle>
          <CardDescription>Subscribe to your tasks &amp; events in Google/Apple Calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          {icalUrl ? (
            <div className="flex items-center gap-1">
              <input readOnly value={icalUrl} onFocus={(e) => e.target.select()} className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-muted/40 text-muted-foreground" />
              <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(icalUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          ) : <Button size="sm" variant="outline" onClick={getIcal}>Get subscription link</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
