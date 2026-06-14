"use client";
import { useEffect, useState } from "react";
import { Video, MapPin, FileText, Loader2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function duration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
}

const STATUS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function MeetingCard({ m }: { m: any }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{m.title}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS[m.status] ?? "bg-gray-100 text-gray-600"}`}>{m.status}</span>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmt(m.startAt)} · {duration(m.startAt, m.endAt)}</p>
        {m.location && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{m.location}</p>}
        {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
        {m.notes && <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 flex items-start gap-1.5"><FileText className="w-3 h-3 mt-0.5 shrink-0" />{m.notes}</div>}
        {m.zoomLink && (
          <a href={m.zoomLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
            <Video className="w-4 h-4" /> Join Zoom
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meetings").then(r => r.json()).then(d => { setMeetings(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = meetings.filter(m => new Date(m.startAt) >= now && m.status !== "cancelled").sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const past = meetings.filter(m => new Date(m.startAt) < now || m.status === "cancelled").sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed border-border rounded-xl">No upcoming meetings scheduled</p> :
              upcoming.map(m => <MeetingCard key={m.id} m={m} />)}
          </div>
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past</h2>
              {past.map(m => <MeetingCard key={m.id} m={m} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
