"use client";

import { useEffect, useState } from "react";
import { TimelineView, TimelineTask } from "@/components/timeline/timeline-view";
import { GanttChart } from "lucide-react";

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar-events")
      .then((r) => r.json())
      .then((data) => {
        const tasks: TimelineTask[] = (data.tasks ?? [])
          .filter((t: any) => t.dueDate)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            createdAt: t.createdAt,
            groupLabel: "Tasks",
          }));

        const cards: TimelineTask[] = (data.cards ?? [])
          .filter((c: any) => c.dueDate)
          .map((c: any) => ({
            id: `card-${c.id}`,
            title: c.title,
            status: "PENDING" as const,
            priority: "MEDIUM" as const,
            dueDate: c.dueDate,
            createdAt: c.createdAt,
            barColor: c.project.color,
            groupLabel: c.project.name,
          }));

        setItems([...tasks, ...cards]);
      })
      .catch(() => setError("Failed to load timeline"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <GanttChart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Timeline</h1>
      </div>

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
        <TimelineView tasks={items} groupByClient={true} />
      )}
    </div>
  );
}
