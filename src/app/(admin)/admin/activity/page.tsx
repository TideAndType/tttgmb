"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckSquare,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Receipt,
  BadgeCheck,
  Clock,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Timer,
  RefreshCw,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────

type EventType =
  | "task_created"
  | "proposal_sent"
  | "proposal_accepted"
  | "proposal_declined"
  | "invoice_created"
  | "invoice_paid"
  | "approval_created"
  | "approval_approved"
  | "approval_changes"
  | "message_posted"
  | "time_logged"
  | "client_login";

interface ActivityEvent {
  id: string;
  type: EventType;
  clientId: string;
  clientName: string;
  companyName: string | null;
  description: string;
  timestamp: string;
  meta?: { href?: string; amount?: number; currency?: string; minutes?: number };
}

interface ClientOption {
  id: string;
  name: string;
  companyName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayLabel(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ── Icon config ────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  EventType,
  { Icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  task_created:       { Icon: CheckSquare,  colorClass: "text-blue-600",   bgClass: "bg-blue-100" },
  proposal_sent:      { Icon: FileText,     colorClass: "text-indigo-600", bgClass: "bg-indigo-100" },
  proposal_accepted:  { Icon: ThumbsUp,     colorClass: "text-green-600",  bgClass: "bg-green-100" },
  proposal_declined:  { Icon: ThumbsDown,   colorClass: "text-red-600",    bgClass: "bg-red-100" },
  invoice_created:    { Icon: Receipt,      colorClass: "text-amber-600",  bgClass: "bg-amber-100" },
  invoice_paid:       { Icon: BadgeCheck,   colorClass: "text-green-600",  bgClass: "bg-green-100" },
  approval_created:   { Icon: Clock,        colorClass: "text-purple-600", bgClass: "bg-purple-100" },
  approval_approved:  { Icon: CheckCircle2, colorClass: "text-green-600",  bgClass: "bg-green-100" },
  approval_changes:   { Icon: RotateCcw,    colorClass: "text-amber-600",  bgClass: "bg-amber-100" },
  message_posted:     { Icon: MessageSquare,colorClass: "text-teal-600",   bgClass: "bg-teal-100" },
  time_logged:        { Icon: Timer,        colorClass: "text-slate-600",  bgClass: "bg-slate-100" },
  client_login:       { Icon: Activity,     colorClass: "text-gray-600",   bgClass: "bg-gray-100" },
};

// ── Type filter pills ──────────────────────────────────────────────────────────

const TYPE_GROUPS: { label: string; types: EventType[] | null }[] = [
  { label: "All",       types: null },
  { label: "Tasks",     types: ["task_created"] },
  { label: "Proposals", types: ["proposal_sent", "proposal_accepted", "proposal_declined"] },
  { label: "Approvals", types: ["approval_created", "approval_approved", "approval_changes"] },
  { label: "Invoices",  types: ["invoice_created", "invoice_paid"] },
  { label: "Messages",  types: ["message_posted"] },
  { label: "Time",      types: ["time_logged"] },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [activeGroup, setActiveGroup] = useState(0);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (clientId) params.set("clientId", clientId);
    const group = TYPE_GROUPS[activeGroup];
    if (group.types) params.set("type", group.types.join(","));
    try {
      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setClients(data.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId, activeGroup]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Group events by day label
  const grouped: { day: string; events: ActivityEvent[] }[] = [];
  for (const event of events) {
    const label = dayLabel(event.timestamp);
    const last = grouped[grouped.length - 1];
    if (last && last.day === label) {
      last.events.push(event);
    } else {
      grouped.push({ day: label, events: [event] });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">Everything happening across all clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeed} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Client dropdown */}
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.companyName ? ` — ${c.companyName}` : ""}
            </option>
          ))}
        </select>

        {/* Type pills */}
        <div className="flex flex-wrap gap-2">
          {TYPE_GROUPS.map((group, idx) => (
            <button
              key={group.label}
              onClick={() => setActiveGroup(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activeGroup === idx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card animate-pulse">
              <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Clock className="h-10 w-10 opacity-30" />
            <p className="text-lg font-medium">No activity yet</p>
            <p className="text-sm">Events will appear here as clients use the portal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ day, events: dayEvents }) => (
            <div key={day}>
              {/* Day divider */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {day}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* Events for this day */}
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.client_login;
                  const { Icon, colorClass, bgClass } = cfg;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`h-9 w-9 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold text-foreground">
                            {event.clientName}
                          </span>
                          {event.companyName && (
                            <span className="text-xs text-muted-foreground">
                              {event.companyName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                        {(event.type === "invoice_created" || event.type === "invoice_paid") &&
                          event.meta?.amount != null && (
                            <p className="text-xs font-medium text-foreground mt-1">
                              {formatCurrency(event.meta.amount, event.meta.currency ?? "USD")}
                            </p>
                          )}
                        {event.type === "time_logged" && event.meta?.minutes != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(event.meta.minutes / 60).toFixed(1)} hours
                          </p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {relativeTime(event.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
