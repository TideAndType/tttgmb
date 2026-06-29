"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";

interface Agency { id: string; name: string; companyName: string | null; role: string; }
interface Announcement { id: string; userId: string; title: string; body: string; createdAt: string; }

export default function SuperAdminAnnouncementsPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/announcements");
    if (res.ok) setAnnouncements((await res.json()).announcements || []);
  };

  useEffect(() => {
    fetch("/api/super-admin/users")
      .then((r) => r.json())
      .then((d) => setAgencies((Array.isArray(d) ? d : []).filter((u: Agency) => u.role === "ADMIN")));
    load();
  }, []);

  const agencyIds = useMemo(() => new Set(agencies.map((a) => a.id)), [agencies]);
  const agencyName = (id: string) => {
    const a = agencies.find((x) => x.id === id);
    return a ? (a.companyName || a.name) : "Agency";
  };
  // Only show announcements addressed to agency (ADMIN) accounts here.
  const agencyAnnouncements = announcements.filter((a) => agencyIds.has(a.userId));

  const post = async () => {
    setError("");
    if (!userId || !title.trim() || !body.trim()) { setError("Pick an agency and fill in both fields."); return; }
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Megaphone className="h-7 w-7 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast a message to an agency account</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-8 space-y-4">
        <h2 className="text-base font-semibold">New Announcement</h2>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm font-medium">Agency</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— Select agency —</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.companyName || a.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Platform update" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write your announcement…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
        </div>
        <button onClick={post} disabled={saving} className="rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {saving ? "Posting…" : "Post announcement"}
        </button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Posted to agencies</h2>
      {agencyAnnouncements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No agency announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {agencyAnnouncements.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{agencyName(a.userId)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="font-semibold text-foreground mt-1">{a.title}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
