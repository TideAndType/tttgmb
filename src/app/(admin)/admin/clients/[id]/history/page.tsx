"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckSquare, CheckCircle, FileText, Receipt } from "lucide-react";

interface HistoryEvent {
  id: string;
  type: "task" | "approval" | "proposal" | "invoice";
  title: string;
  status: string;
  meta: string;
  date: string;
}

interface ClientInfo {
  name: string | null;
  companyName: string | null;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status?.toUpperCase();
  if (["COMPLETED", "APPROVED", "ACCEPTED"].includes(s)) return "default";
  if (["IN_PROGRESS", "PENDING"].includes(s)) return "secondary";
  if (["CHANGES_REQUESTED", "DECLINED"].includes(s)) return "destructive";
  return "outline";
}

function EventIcon({ type }: { type: HistoryEvent["type"] }) {
  const cls = "h-4 w-4 text-muted-foreground";
  if (type === "task") return <CheckSquare className={cls} />;
  if (type === "approval") return <CheckCircle className={cls} />;
  if (type === "proposal") return <FileText className={cls} />;
  return <Receipt className={cls} />;
}

export default function ClientHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}/history`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client);
        setEvents(data.events ?? []);
        setLoading(false);
      });
  }, [id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">
          {client?.companyName || client?.name || "Client"} — Work History
        </h1>
        {client?.companyName && client?.name && (
          <p className="text-muted-foreground mt-1">{client.name}</p>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-16">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">No history yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {events.map((event, i) => (
              <div key={`${event.type}-${event.id}`} className="flex gap-4 relative">
                <div className="w-10 flex items-start justify-end pt-4 shrink-0">
                  <EventIcon type={event.type} />
                </div>
                <div className="flex items-start pt-4 shrink-0">
                  <div className="h-3 w-3 rounded-full bg-primary border-2 border-background ring-1 ring-border z-10" />
                </div>
                <div className={`flex-1 pb-6 ${i < events.length - 1 ? "" : ""}`}>
                  <div className="pt-3 pl-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground leading-snug">{event.title}</p>
                      <Badge variant={statusVariant(event.status)} className="text-xs shrink-0">
                        {event.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {event.meta && (
                        <span className="text-muted-foreground text-sm">{event.meta}</span>
                      )}
                      {event.meta && <span className="text-muted-foreground text-sm">·</span>}
                      <span className="text-muted-foreground text-sm">{formatDate(event.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
