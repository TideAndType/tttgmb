"use client";

import { useEffect, useState } from "react";
import { ConnectionBadge } from "@/components/integrations/connection-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Globe, Phone, MapPin } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GmbMetrics {
  totalImpressions: number;
  websiteClicks: number;
  callClicks: number;
  directionRequests: number;
}

interface GmbLocation {
  name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
}

interface TimeSeries {
  date: string;
  impressions: number;
  websiteClicks: number;
  callClicks: number;
  directionRequests: number;
}

interface GmbAccount {
  name: string;
  accountName: string;
}

interface GmbLocationItem {
  name: string;
  title: string;
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

export default function GmbPage() {
  const [gmbConnected, setGmbConnected] = useState(false);
  const [accountSet, setAccountSet] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [location, setLocation] = useState<GmbLocation | null>(null);
  const [metrics, setMetrics] = useState<GmbMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeries[]>([]);
  const [accounts, setAccounts] = useState<GmbAccount[]>([]);
  const [locations, setLocations] = useState<GmbLocationItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmb_connected") === "true") {
      setGmbConnected(true);
      loadAccounts();
      setLoading(false);
    } else {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch("/api/gmb/data");
    if (res.status === 400) {
      const d = await res.json();
      if (d.error === "GMB not connected") {
        setGmbConnected(false);
        setLoading(false);
        return;
      }
      if (d.error === "GMB location not selected") {
        setGmbConnected(true);
        setAccountSet(true);
        setLocationSet(false);
        loadLocations();
        setLoading(false);
        return;
      }
      // "GMB account not selected" (or anything else) — connected but no account set
      setGmbConnected(true);
      setAccountSet(false);
      loadAccounts();
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Failed to load GMB data.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setGmbConnected(true);
    setAccountSet(true);
    setLocationSet(true);
    setLocation(data.location);
    setMetrics(data.metrics);
    setTimeSeries(data.timeSeries);
    setLoading(false);
  };

  const loadAccounts = async () => {
    setError("");
    const res = await fetch("/api/gmb/accounts");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAccounts(data.accounts || []);
    } else if (data.error && data.error !== "GMB not connected") {
      setError(data.error);
    }
  };

  const loadLocations = async () => {
    setError("");
    const res = await fetch("/api/gmb/locations");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setLocations(data.locations || []);
    } else if (data.error) {
      setError(data.error);
    }
  };

  const handleConnect = async () => {
    const res = await fetch("/api/gmb/connect");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount) return;
    setSavingAccount(true);
    const res = await fetch("/api/gmb/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: selectedAccount }),
    });
    if (res.ok) {
      setAccountSet(true);
      loadLocations();
    } else {
      setError("Failed to save account selection.");
    }
    setSavingAccount(false);
  };

  const handleSaveLocation = async () => {
    if (!selectedLocation) return;
    setSavingLocation(true);
    const res = await fetch("/api/gmb/location", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: selectedLocation }),
    });
    if (res.ok) {
      setLocationSet(true);
      loadData();
    } else {
      setError("Failed to save location selection.");
    }
    setSavingLocation(false);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Google My Business</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not connected
  if (!gmbConnected) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Google My Business</h1>
          <p className="text-muted-foreground mt-1">Connect your Business Profile to see performance stats</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Google My Business</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Connect your Google Business Profile to view impressions, website clicks, call clicks, and direction requests.
            </p>
            <Button onClick={handleConnect}>Connect Google My Business</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected, no account selected
  if (gmbConnected && !accountSet) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Google My Business</h1>
          <p className="text-muted-foreground mt-1">Select your business account</p>
        </div>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Select a Business Account</CardTitle>
          </CardHeader>
          <CardContent>
            {!error && accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Business Profile accounts found on the Google account you connected. Make sure you authorized with the
                Google account that manages this business in Google Business Profile, and that the Business Profile API is
                enabled.
              </p>
            ) : null}
            <div className="flex gap-3 flex-wrap items-center">
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[260px]"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="">— Select account —</option>
                {accounts.map((a) => (
                  <option key={a.name} value={a.name}>{a.accountName || a.name}</option>
                ))}
              </select>
              <Button onClick={handleSaveAccount} disabled={!selectedAccount || savingAccount}>
                {savingAccount ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Account set, no location selected
  if (gmbConnected && accountSet && !locationSet) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Google My Business</h1>
          <p className="text-muted-foreground mt-1">Select your business location</p>
        </div>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Select a Location</CardTitle>
          </CardHeader>
          <CardContent>
            {!error && locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No locations found under this Business Profile account. Confirm the account actually has a verified
                business location.
              </p>
            ) : null}
            <div className="flex gap-3 flex-wrap items-center">
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-w-[260px]"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">— Select location —</option>
                {locations.map((l) => (
                  <option key={l.name} value={l.name}>{l.title || l.name}</option>
                ))}
              </select>
              <Button onClick={handleSaveLocation} disabled={!selectedLocation || savingLocation}>
                {savingLocation ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fully connected — dashboard
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Google My Business</h1>
        <p className="text-muted-foreground mt-1">{location?.name} — last 30 days</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <ConnectionBadge service="gmb" label="Google Business Profile" onDisconnected={() => { setGmbConnected(false); setAccountSet(false); setLocationSet(false); }} />
      </div>

      {/* 4 stat cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Eye} label="Impressions" value={metrics.totalImpressions.toLocaleString()} />
          <StatCard icon={Globe} label="Website Clicks" value={metrics.websiteClicks.toLocaleString()} />
          <StatCard icon={Phone} label="Call Clicks" value={metrics.callClicks.toLocaleString()} />
          <StatCard icon={MapPin} label="Direction Requests" value={metrics.directionRequests.toLocaleString()} />
        </div>
      )}

      {/* Line chart */}
      {timeSeries.length > 0 && (
        <Card className="mb-8">
          <CardHeader><CardTitle>Performance Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="impressions" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Impressions" />
                <Line type="monotone" dataKey="websiteClicks" stroke="#6366f1" strokeWidth={2} dot={false} name="Website Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Location info card */}
      {location && (
        <Card>
          <CardHeader><CardTitle className="text-base">Location Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {location.address && (
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{location.address}</span>
              </div>
            )}
            {location.website && (
              <div className="flex gap-2">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a href={location.website} target="_blank" className="text-primary hover:underline">{location.website}</a>
              </div>
            )}
            {location.phone && (
              <div className="flex gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{location.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
