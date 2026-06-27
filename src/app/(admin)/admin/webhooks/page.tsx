"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Webhook as WebhookIcon, Trash2, Plus } from "lucide-react";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((d) => { setWebhooks(d.webhooks ?? []); setEvents(d.availableEvents ?? []); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleEvent = (e: string) =>
    setSelected((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const create = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/webhooks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret, events: selected }),
    });
    setSaving(false);
    if (res.ok) {
      setUrl(""); setSecret(""); setSelected([]); setShowForm(false); load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to create webhook");
    }
  };

  const toggleActive = async (w: Webhook) => {
    const res = await fetch(`/api/webhooks/${w.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !w.active }),
    });
    if (res.ok) setWebhooks((prev) => prev.map((x) => x.id === w.id ? { ...x, active: !x.active } : x));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) setWebhooks((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <WebhookIcon className="h-6 w-6" /> Webhooks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Send portal events to Zapier, Make, or any HTTPS endpoint as JSON.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Webhook</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Webhook</CardTitle>
            <CardDescription>We&apos;ll POST a JSON payload to this URL when the selected events fire.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="space-y-2">
              <Label htmlFor="url">Endpoint URL</Label>
              <Input id="url" placeholder="https://hooks.zapier.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Signing secret (optional)</Label>
              <Input id="secret" placeholder="Used to sign payloads (X-Webhook-Signature)" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {events.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleEvent(e)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                      selected.includes(e)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving || !url || selected.length === 0}>
                {saving ? "Saving..." : "Create Webhook"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <WebhookIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No webhooks yet. Add one to start sending events.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-foreground truncate">{w.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.events.map((e) => (
                        <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{e}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {w.lastFiredAt
                        ? `Last fired ${new Date(w.lastFiredAt).toLocaleString()} · HTTP ${w.lastStatus ?? "—"}`
                        : "Never fired"}
                      {w.secret && " · signed"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(w)}
                      className={`text-xs px-2 py-1 rounded-md border ${w.active ? "border-green-300 text-green-600" : "border-border text-muted-foreground"}`}
                    >
                      {w.active ? "Active" : "Paused"}
                    </button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
