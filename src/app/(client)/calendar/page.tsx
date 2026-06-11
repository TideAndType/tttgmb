"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
}

// ── Calendar helpers ────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityColors: Record<string, { dot: string; chip: string }> = {
  HIGH:   { dot: "bg-red-500",   chip: "bg-red-50 text-red-700 border border-red-200" },
  MEDIUM: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border border-amber-200" },
  LOW:    { dot: "bg-blue-500",  chip: "bg-blue-50 text-blue-700 border border-blue-200" },
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

// ── Popover ─────────────────────────────────────────────────────────
interface PopoverTask extends Task {}

interface TaskPopoverProps {
  task: PopoverTask;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function TaskPopover({ task, anchorRef, onClose }: TaskPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  const colors = priorityColors[task.priority] ?? priorityColors.MEDIUM;

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 w-64 bg-white dark:bg-card border border-border rounded-lg shadow-lg p-3 text-sm"
      style={{ top: "calc(100% + 4px)", left: 0 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-foreground leading-snug">{task.title}</p>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors.chip)}>
          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()} priority
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
          {statusLabels[task.status]}
        </span>
      </div>
      <Link
        href={`/tasks`}
        className="text-primary text-xs font-medium hover:underline"
        onClick={onClose}
      >
        View task →
      </Link>
    </div>
  );
}

// ── Task chip ────────────────────────────────────────────────────────
function TaskChip({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const colors = priorityColors[task.priority] ?? priorityColors.MEDIUM;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          "w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-left truncate",
          colors.chip
        )}
        title={task.title}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", colors.dot)} />
        <span className="truncate">{task.title}</span>
      </button>
      {open && (
        <TaskPopover
          task={task}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── Calendar grid ────────────────────────────────────────────────────
interface CalendarGridProps {
  year: number;
  month: number;
  tasksByDate: Map<string, Task[]>;
  today: Date;
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function CalendarGrid({ year, month, tasksByDate, today }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);
  const prevMonth = month - 1 < 0 ? 11 : month - 1;
  const prevYear = month - 1 < 0 ? year - 1 : year;
  const nextMonth = month + 1 > 11 ? 0 : month + 1;
  const nextYear = month + 1 > 11 ? year + 1 : year;

  const cells: { day: number; m: number; y: number; current: boolean }[] = [];

  // Prev month tail
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, m: prevMonth, y: prevYear, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, m: month, y: year, current: true });
  }
  // Next month head (fill to 6 rows = 42 cells)
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, m: nextMonth, y: nextYear, current: false });
  }

  return (
    <div className="grid grid-cols-7 border-l border-t border-border">
      {DAY_NAMES.map((d) => (
        <div
          key={d}
          className="border-r border-b border-border px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 text-center"
        >
          {d}
        </div>
      ))}
      {cells.map((cell, idx) => {
        const key = dateKey(cell.y, cell.m, cell.day);
        const dayTasks = tasksByDate.get(key) ?? [];
        const visible = dayTasks.slice(0, 3);
        const overflow = dayTasks.length - 3;
        const isToday = isSameDay(new Date(cell.y, cell.m, cell.day), today);

        return (
          <div
            key={idx}
            className={cn(
              "border-r border-b border-border p-1.5 min-h-[100px] flex flex-col",
              !cell.current && "bg-muted/20"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 self-start",
                isToday ? "bg-primary text-primary-foreground font-bold" : "",
                !cell.current && !isToday ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {cell.day}
            </span>
            <div className="flex flex-col gap-0.5 flex-1">
              {visible.map((t) => (
                <TaskChip key={t.id} task={t} />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted-foreground px-1">
                  +{overflow} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile list view ─────────────────────────────────────────────────
function MobileListView({ year, month, tasksByDate }: { year: number; month: number; tasksByDate: Map<string, Task[]> }) {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date();
  const entries: { day: number; tasks: Task[] }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    const tasks = tasksByDate.get(key) ?? [];
    if (tasks.length > 0) {
      entries.push({ day: d, tasks });
    }
  }

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No tasks with due dates this month.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(({ day, tasks }) => {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, today);
        return (
          <div key={day} className="border border-border rounded-lg overflow-hidden">
            <div className={cn("px-3 py-2 text-sm font-semibold", isToday ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground")}>
              {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="p-2 space-y-1">
              {tasks.map((t) => <TaskChip key={t.id} task={t} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        const all: Task[] = (data.tasks ?? []).filter((t: Task) => !!t.dueDate);
        setTasks(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = useCallback((): Map<string, Task[]> => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      // Parse ISO date preserving local date
      const d = new Date(t.dueDate);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return map;
  }, [tasks]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const map = tasksByDate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">{MONTH_NAMES[month]} {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold w-36 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading calendar…
        </div>
      ) : isMobile ? (
        <MobileListView year={year} month={month} tasksByDate={map} />
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-border">
          <CalendarGrid year={year} month={month} tasksByDate={map} today={today} />
        </div>
      )}
    </div>
  );
}
