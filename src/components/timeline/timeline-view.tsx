"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface TimelineTask {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string;
  createdAt: string;
  barColor?: string; // admin passes client color; client uses status color
  groupLabel?: string; // admin passes company name
}

export interface TimelineViewProps {
  tasks: TimelineTask[];
  groupByClient?: boolean; // admin mode
}

const COL_WIDTH = 32;
const TOTAL_DAYS = 60;
const START_OFFSET = 14; // days before today where timeline starts

function getTimelineStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - START_OFFSET);
  return start;
}

function dayOffset(date: Date, timelineStart: Date): number {
  return Math.floor(
    (date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function statusColor(
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED",
  isOverdue: boolean
): string {
  if (isOverdue) return "rgba(239,68,68,0.7)";
  if (status === "PENDING") return "rgba(59,130,246,0.6)";
  if (status === "IN_PROGRESS") return "rgba(245,158,11,0.6)";
  return "rgba(34,197,94,0.6)";
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  COMPLETED: "Completed",
};

const STATUS_ORDER = ["IN_PROGRESS", "PENDING", "COMPLETED"];

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

function clientColorForId(id: string): string {
  // Simple hash of id chars mod 8
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % 8;
  }
  return CLIENT_COLORS[hash];
}

export function TimelineView({ tasks, groupByClient = false }: TimelineViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [windowOffset, setWindowOffset] = useState(0); // shift in days
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute timeline window
  const timelineStart = getTimelineStart();
  timelineStart.setDate(timelineStart.getDate() + windowOffset);

  const todayOffset = dayOffset(today, timelineStart);

  // Generate day headers
  const days: Date[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(timelineStart);
    d.setDate(timelineStart.getDate() + i);
    days.push(d);
  }

  // Filter to tasks with dueDates
  const tasksWithDates = tasks.filter((t) => t.dueDate);

  // Group
  let groups: { key: string; label: string; tasks: TimelineTask[] }[] = [];

  if (groupByClient) {
    // Group by groupLabel (company name)
    const map = new Map<string, TimelineTask[]>();
    for (const t of tasksWithDates) {
      const key = t.groupLabel || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    groups = Array.from(map.entries()).map(([label, tasks]) => ({
      key: label,
      label,
      tasks,
    }));
  } else {
    for (const statusKey of STATUS_ORDER) {
      const filtered = tasksWithDates.filter((t) => t.status === statusKey);
      if (filtered.length > 0) {
        groups.push({
          key: statusKey,
          label: STATUS_LABELS[statusKey] || statusKey,
          tasks: filtered,
        });
      }
    }
  }

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No tasks with due dates
      </div>
    );
  }

  const totalWidth = TOTAL_DAYS * COL_WIDTH;

  return (
    <div className="flex flex-col h-full">
      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWindowOffset((o) => o - 30)}
          className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        >
          ← Previous month
        </button>
        <button
          onClick={() => setWindowOffset(0)}
          className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => setWindowOffset((o) => o + 30)}
          className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        >
          Next month →
        </button>
      </div>

      {/* Timeline container */}
      <div className="flex border border-border rounded-lg overflow-hidden flex-1">
        {/* Left fixed column */}
        <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
          {/* Header spacer */}
          <div className="h-10 border-b border-border bg-muted/30 flex items-center px-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Task
            </span>
          </div>

          {/* Group rows */}
          {groups.map((group) => (
            <div key={group.key}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(group.key)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors"
              >
                {collapsed[group.key] ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-xs font-semibold text-foreground truncate">
                  {group.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.tasks.length}
                </span>
              </button>

              {/* Task rows */}
              {!collapsed[group.key] &&
                group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col justify-center px-3 py-2 border-b border-border h-12 bg-background"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: PRIORITY_COLORS[task.priority],
                        }}
                      />
                      <span className="text-xs font-medium text-foreground truncate">
                        {task.title}
                      </span>
                    </div>
                    {groupByClient && task.groupLabel && (
                      <span className="text-xs text-muted-foreground truncate mt-0.5 pl-3.5">
                        {task.groupLabel}
                      </span>
                    )}
                    {!groupByClient && (
                      <span className="text-xs text-muted-foreground truncate mt-0.5 pl-3.5">
                        {STATUS_LABELS[task.status]}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Right scrollable area */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Date header */}
            <div className="flex h-10 border-b border-border bg-muted/30 sticky top-0 z-10">
              {days.map((day, i) => {
                const isToday = dayOffset(day, timelineStart) === todayOffset;
                const isMonthStart = day.getDate() === 1;
                return (
                  <div
                    key={i}
                    style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
                    className={`flex-shrink-0 flex items-center justify-center text-xs border-r border-border/50 relative
                      ${isToday ? "bg-red-50 dark:bg-red-950/20 font-bold text-red-600" : "text-muted-foreground"}
                      ${isMonthStart ? "border-l-2 border-l-primary/40" : ""}`}
                  >
                    {isMonthStart ? (
                      <span className="text-[10px] font-semibold text-primary absolute top-0 left-0.5">
                        {day.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    ) : null}
                    <span className={isMonthStart ? "mt-2" : ""}>{day.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Groups and task bars */}
            {groups.map((group) => (
              <div key={group.key}>
                {/* Section header (right side) */}
                <div
                  style={{ width: totalWidth }}
                  className="h-9 border-b border-border bg-muted/50"
                />

                {/* Task bar rows */}
                {!collapsed[group.key] &&
                  group.tasks.map((task) => {
                    const start = new Date(task.createdAt);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(task.dueDate);
                    end.setHours(0, 0, 0, 0);

                    const isOverdue =
                      task.status !== "COMPLETED" && end < today;

                    const barLeft = dayOffset(start, timelineStart);
                    const barEnd = dayOffset(end, timelineStart);
                    const barWidth = Math.max(barEnd - barLeft + 1, 1);

                    // Determine bar color
                    let bar: string;
                    if (task.barColor) {
                      bar = task.barColor;
                    } else {
                      bar = statusColor(task.status, isOverdue);
                    }

                    // Clamp to visible area for rendering
                    const clampedLeft = Math.max(barLeft, 0);
                    const clampedRight = Math.min(barLeft + barWidth, TOTAL_DAYS);
                    const clampedWidth = Math.max(clampedRight - clampedLeft, 0);

                    return (
                      <div
                        key={task.id}
                        className="relative border-b border-border h-12 bg-background"
                        style={{ width: totalWidth }}
                      >
                        {/* Today marker */}
                        {todayOffset >= 0 && todayOffset < TOTAL_DAYS && (
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
                            style={{ left: todayOffset * COL_WIDTH }}
                          />
                        )}

                        {/* Task bar */}
                        {clampedWidth > 0 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 rounded-full"
                            style={{
                              left: clampedLeft * COL_WIDTH + 2,
                              width: clampedWidth * COL_WIDTH - 4,
                              height: 24,
                              backgroundColor: bar,
                              borderRadius: 12,
                            }}
                            title={`${task.title}: ${new Date(task.createdAt).toLocaleDateString()} – ${new Date(task.dueDate).toLocaleDateString()}`}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
