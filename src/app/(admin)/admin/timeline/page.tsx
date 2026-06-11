"use client";

import { useEffect, useState } from "react";
import { TimelineView, TimelineTask } from "@/components/timeline/timeline-view";
import { GanttChart } from "lucide-react";

interface RawTask {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    companyName: string | null;
  };
}

const CLIENT_COLORS = [
  "rgba(99,102,241,0.65)",
  "rgba(236,72,153,0.65)",
  "rgba(20,184,166,0.65)",
  "rgba(245,158,11,0.65)",
  "rgba(239,68,68,0.65)",
  "rgba(34,197,94,0.65)",
  "rgba(168,85,247,0.65)",
  "rgba(59,130,246,0.65)",
];

function colorForClientId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % CLIENT_COLORS.length;
  }
  return CLIENT_COLORS[hash];
}

export default function AdminTimelinePage() {
  const [allTasks, setAllTasks] = useState<TimelineTask[]>([]);
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        const raw: RawTask[] = data.tasks ?? [];
        const withDates = raw.filter((t) => t.dueDate);

        // Build client list from unique user ids
        const clientMap = new Map<string, string>();
        for (const t of withDates) {
          if (t.user) {
            const label = t.user.companyName || t.user.name;
            clientMap.set(t.user.id, label);
          }
        }
        const clientList = Array.from(clientMap.entries()).map(([id, label]) => ({
          id,
          label,
        }));
        setClients(clientList);

        const mapped: TimelineTask[] = withDates.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate!,
          createdAt: t.createdAt,
          barColor: t.user ? colorForClientId(t.user.id) : undefined,
          groupLabel: t.user
            ? t.user.companyName || t.user.name
            : "Unknown",
        }));
        setAllTasks(mapped);
      })
      .catch(() => setError("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = selectedClient
    ? allTasks.filter((t) => {
        // match groupLabel — find the client label for selected id
        const client = clients.find((c) => c.id === selectedClient);
        return client ? t.groupLabel === client.label : true;
      })
    : allTasks;

  return (
    <div className="p-6 flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 mb-4">
        <GanttChart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Timeline</h1>
      </div>

      {/* Client filter bar */}
      {!loading && !error && clients.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedClient(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedClient === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            All clients
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                setSelectedClient(selectedClient === c.id ? null : c.id)
              }
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedClient === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading timeline...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-20 text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <TimelineView tasks={filteredTasks} groupByClient={true} />
      )}
    </div>
  );
}
