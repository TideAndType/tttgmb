"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Loader2 } from "lucide-react";
import Link from "next/link";

export function MeetingsWidget() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meetings?upcoming=true&limit=3").then(r => r.json()).then(d => { setMeetings(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Upcoming Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> :
          meetings.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No upcoming meetings</p> : (
            <>
              <div className="space-y-3">
                {meetings.map((m: any) => (
                  <div key={m.id} className="text-sm">
                    <p className="font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    {m.zoomLink && <a href={m.zoomLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Join Zoom →</a>}
                  </div>
                ))}
              </div>
              <Link href="/meetings" className="text-xs text-primary hover:underline block pt-2">View all meetings →</Link>
            </>
          )}
      </CardContent>
    </Card>
  );
}
