"use client";
import { useEffect, useState } from "react";
import { Video, Plus, Pencil, Trash2, Loader2, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Client { id: string; name: string; email: string; companyName: string | null; }
interface Meeting { id: string; userId: string; title: string; description?: string; startAt: string; endAt: string; location?: string; zoomLink?: string; notes?: string; status: string; }

const STATUS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function dur(start: string, end: string) {
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
}
function toLocal(iso: string) { return iso ? iso.slice(0, 16) : ""; }

function MeetingModal({ meeting, clients, onClose, onSaved }: { meeting: Meeting | null; clients: Client[]; onClose: () => void; onSaved: () => void; }) {
  const isNew = !meeting;
  const [userId, setUserId] = useState(meeting?.userId ?? "");
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [description, setDescription] = useState(meeting?.description ?? "");
  const [startAt, setStartAt] = useState(meeting ? toLocal(meeting.startAt) : "");
  const [endAt, setEndAt] = useState(meeting ? toLocal(meeting.endAt) : "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [zoomLink, setZoomLink] = useState(meeting?.zoomLink ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [status, setStatus] = useState(meeting?.status ?? "scheduled");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!userId || !title || !startAt || !endAt) { setError("Client, title, start and end are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(isNew ? "/api/meetings" : `/api/meetings/${meeting!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, description, startAt, endAt, location, zoomLink, notes, status }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch { setError("Failed to save meeting."); } finally { setSaving(false); }
  }

  const field = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{isNew ? "New Meeting" : "Edit Meeting"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{error}</p>}
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Client *</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className={field}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName ?? c.name} ({c.email})</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={field} placeholder="Weekly Check-in" />
          </div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className={field} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Start *</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={field} /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">End *</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={field} /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className={field} placeholder="Conference room / address" /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Zoom Link</label>
            <input value={zoomLink} onChange={e => setZoomLink(e.target.value)} className={field} placeholder="https://zoom.us/j/…" /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className={field} rows={3} /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={field}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}{isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Meeting | null | "new">(null);

  async function load() {
    const [m, c] = await Promise.all([
      fetch("/api/meetings").then(r => r.json()),
      fetch("/api/admin/clients").then(r => r.json()),
    ]);
    setMeetings(Array.isArray(m) ? m : []);
    setClients(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("Delete this meeting?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings(prev => prev.filter(m => m.id !== id));
  }

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.companyName ?? c.name]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {editing && (
        <MeetingModal
          meeting={editing === "new" ? null : editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and manage client meetings</p></div>
        <Button onClick={() => setEditing("new")} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> New Meeting
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Video className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">No meetings yet</p>
          <Button onClick={() => setEditing("new")} size="sm" className="mt-3 bg-primary text-primary-foreground">Schedule a Meeting</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).map(m => (
            <Card key={m.id}>
              <CardContent className="py-4 flex items-start gap-4">
                <div className="shrink-0 text-center bg-primary/10 rounded-xl px-3 py-2 min-w-[56px]">
                  <p className="text-xs font-medium text-primary uppercase">{new Date(m.startAt).toLocaleDateString("en-US", { month: "short" })}</p>
                  <p className="text-xl font-bold text-primary">{new Date(m.startAt).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{m.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[m.status] ?? "bg-gray-100 text-gray-600"}`}>{m.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{clientMap[m.userId] ?? m.userId}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(m.startAt)} · {dur(m.startAt, m.endAt)}</span>
                    {m.location && <span className="text-xs text-gray-400">{m.location}</span>}
                    {m.zoomLink && <a href={m.zoomLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Video className="w-3 h-3" />Zoom</a>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(m)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => del(m.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
