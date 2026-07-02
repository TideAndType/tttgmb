"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity as ActivityIcon, CheckSquare, FileText, Receipt, CheckCircle,
  MessageSquare, Clock, ThumbsUp, ThumbsDown, MessageCircle, Paperclip,
} from "lucide-react";

interface Event {
  id: string;
  type: string;
  category: string;
  description: string;
  timestamp: string;
  href?: string;
}

const ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  task_created: { icon: CheckSquare, className: "text-blue-500" },
  proposal_sent: { icon: FileText, className: "text-violet-500" },
  proposal_accepted: { icon: ThumbsUp, className: "text-green-500" },
  proposal_declined: { icon: ThumbsDown, className: "text-red-500" },
  invoice_created: { icon: Receipt, className: "text-amber-500" },
  invoice_paid: { icon: Receipt, className: "text-green-500" },
  approval_created: { icon: CheckCircle, className: "text-sky-500" },
  approval_approved: { icon: ThumbsUp, className: "text-green-500" },
  approval_changes: { icon: CheckCircle, className: "text-amber-500" },
  message_posted: { icon: MessageSquare, className: "text-indigo-500" },
  chat_posted: { icon: MessageSquare, className: "text-indigo-500" },
  comment_posted: { icon: MessageCircle, className: "text-pink-500" },
  file_uploaded: { icon: Paperclip, className: "text-cyan-500" },
  time_logged: { icon: Clock, className: "text-teal-500" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "messages", label: "Messages" },
  { key: "comments", label: "Comments" },
  { key: "files", label: "Files" },
  { key: "tasks", label: "Tasks" },
  { key: "approvals", label: "Approvals" },
  { key: "billing", label: "Billing" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);
  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This week";
  return "Earlier";
}

export default function ActivityPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d.events) ? d.events : []))
      .finally(() => setLoading(false));
  }, []);

  // Only show filter chips for categories that actually have events.
  const presentCategories = new Set(events.map((e) => e.category));
  const availableFilters = FILTERS.filter((f) => f.key === "all" || presentCategories.has(f.key));
  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  const groups: { label: string; items: Event[] }[] = [];
  for (const e of filtered) {
    const label = groupLabel(e.timestamp);
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(e);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <ActivityIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Everything</h1>
          <p className="text-muted-foreground mt-1">Messages, comments, files, and activity across your account</p>
        </div>
      </div>

      {!loading && events.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ActivityIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No activity yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((e) => {
                  const cfg = ICONS[e.type] ?? { icon: ActivityIcon, className: "text-muted-foreground" };
                  const Icon = cfg.icon;
                  const inner = (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
                      <div className={`mt-0.5 ${cfg.className}`}><Icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(e.timestamp)}</p>
                      </div>
                    </div>
                  );
                  return e.href ? <Link key={e.id} href={e.href}>{inner}</Link> : <div key={e.id}>{inner}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
