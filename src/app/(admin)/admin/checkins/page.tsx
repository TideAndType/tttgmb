"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { MessageCircle, Trash2 } from "lucide-react";

interface Client { id: string; name: string; companyName: string | null; }
interface CheckIn { id: string; userId: string; prompt: string; cadence: string; createdAt: string; }

export default function AdminCheckInsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [userId, setUserId] = useState("");
  const [prompt, setPrompt] = useState("What did you work on today?");
  const [cadence, setCadence] = useState("weekdays");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/checkins");
    if (res.ok) setCheckIns((await res.json()).checkIns || []);
  };

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : []));
    load();
  }, []);

  const create = async () => {
    setError("");
    if (!userId || !prompt.trim()) { setError("Pick a client and enter a prompt."); return; }
    setSaving(true);
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, prompt, cadence }),
    });
    setSaving(false);
    if (res.ok) { setPrompt("What did you work on today?"); load(); }
    else setError("Failed to create check-in.");
  };

  const remove = async (id: string) => {
    await fetch(`/api/checkins/${id}`, { method: "DELETE" });
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
  };

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? (c.companyName || c.name) : "Client";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Check-ins</h1>
          <p className="text-sm text-muted-foreground">Recurring prompts a client&apos;s team answers — instead of status meetings</p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">New Check-in</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-1">
            <Label>Client</Label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">— Select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p">Prompt</Label>
            <Input id="p" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Cadence</Label>
            <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
            </select>
            <p className="text-xs text-muted-foreground">Cadence is a label for now — the prompt shows on the client dashboard for daily replies.</p>
          </div>
          <Button onClick={create} disabled={saving}>{saving ? "Creating…" : "Create check-in"}</Button>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active</h2>
      {checkIns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No check-ins yet.</p>
      ) : (
        <div className="space-y-3">
          {checkIns.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{clientName(c.userId)}</span>
                    <span className="text-xs text-muted-foreground capitalize">{c.cadence}</span>
                  </div>
                  <p className="font-medium text-foreground mt-1">{c.prompt}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
