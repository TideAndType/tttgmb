"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Megaphone, Trash2 } from "lucide-react";

interface Client { id: string; name: string; companyName: string | null; }
interface Announcement { id: string; userId: string; title: string; body: string; authorName: string; createdAt: string; }

export default function AdminAnnouncementsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterClient, setFilterClient] = useState("");

  const load = async (clientId = filterClient) => {
    const url = clientId ? `/api/announcements?clientId=${clientId}` : "/api/announcements";
    const res = await fetch(url);
    if (res.ok) {
      setAnnouncements((await res.json()).announcements || []);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || `Couldn't load announcements (${res.status}). Has the migration been run?`);
    }
  };

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { load(filterClient); }, [filterClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async () => {
    setError("");
    if (!userId || !title.trim() || !body.trim()) { setError("Pick a client and fill in both fields."); return; }
    setSaving(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body }),
    });
    setSaving(false);
    if (res.ok) { setTitle(""); setBody(""); load(); }
    else setError("Failed to post announcement.");
  };

  const remove = async (id: string) => {
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? (c.companyName || c.name) : "Client";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Megaphone className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast a message to a client&apos;s portal</p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">New Announcement</CardTitle></CardHeader>
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
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Holiday hours" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b">Message</Label>
            <Textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write your announcement…" />
          </div>
          <Button onClick={post} disabled={saving}>{saving ? "Posting…" : "Post announcement"}</Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Posted</h2>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
        </select>
      </div>
      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{filterClient ? "No announcements for this client." : "No announcements yet."}</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{clientName(a.userId)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-semibold text-foreground mt-1">{a.title}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(a.id)}>
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
