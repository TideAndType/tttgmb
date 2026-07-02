"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  user: { id: string; name: string; companyName?: string | null };
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

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 8 distinct client colors (bg + text)
const CLIENT_COLORS = [
  { chip: "bg-violet-100 text-violet-800 border border-violet-200", dot: "bg-violet-500" },
  { chip: "bg-sky-100 text-sky-800 border border-sky-200", dot: "bg-sky-500" },
  { chip: "bg-emerald-100 text-emerald-800 border border-emerald-200", dot: "bg-emerald-500" },
  { chip: "bg-rose-100 text-rose-800 border border-rose-200", dot: "bg-rose-500" },
  { chip: "bg-amber-100 text-amber-800 border border-amber-200", dot: "bg-amber-500" },
  { chip: "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200", dot: "bg-fuchsia-500" },
  { chip: "bg-teal-100 text-teal-800 border border-teal-200", dot: "bg-teal-500" },
  { chip: "bg-orange-100 text-orange-800 border border-orange-200", dot: "bg-orange-500" },
];

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const priorityBadge: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border border-amber-200",
  LOW: "bg-blue-100 text-blue-700 border border-blue-200",
};

// ── Popover ─────────────────────────────────────────────────────────

interface TaskPopoverProps {
  task: Task;
  color: { chip: string; dot: string };
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function TaskPopover({ task, color, anchorRef, onClose }: TaskPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  const clientLabel = task.user.companyName || task.user.name;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 bg-white dark:bg-card border border-border rounded-lg shadow-lg p-3 text-sm"
      style={{ top: "calc(100% + 4px)", left: 0 }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-foreground leading-snug">{task.title}</p>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{clientLabel}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityBadge[task.priority])}>
          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()} priority
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
          {statusLabels[task.status]}
        </span>
      </div>
      <Link
        href="/admin/tasks"
        className="text-primary text-xs font-medium hover:underline"
        onClick={onClose}
      >
        View task →
      </Link>
    </div>
  );
}

// ── Task chip ────────────────────────────────────────────────────────

function TaskChip({ task, color }: { task: Task; color: { chip: string; dot: string } }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const clientLabel = task.user.companyName || task.user.name;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          "w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-left",
          color.chip
        )}
        title={`[${clientLabel}] ${task.title}`}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", color.dot)} />
        <span className="truncate">[{clientLabel}] {task.title}</span>
      </button>
      {open && (
        <TaskPopover
          task={task}
          color={color}
          anchorRef={btnRef}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── Calendar layers + events ─────────────────────────────────────────

interface Cal { id: string; name: string; color: string; }
interface CalEvent { id: string; title: string; date: string; description?: string | null; calendar: Cal; }

function EventChip({ event, onDelete }: { event: CalEvent; onDelete?: (id: string) => void }) {
  return (
    <span
      className="group/ev w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-left text-white"
      style={{ backgroundColor: event.calendar.color }}
      title={`[${event.calendar.name}] ${event.title}`}
    >
      <span className="truncate flex-1">{event.title}</span>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} className="opacity-0 group-hover/ev:opacity-100 shrink-0">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ── Calendar grid ────────────────────────────────────────────────────

interface CalendarGridProps {
  year: number;
  month: number;
  tasksByDate: Map<string, Task[]>;
  eventsByDate: Map<string, CalEvent[]>;
  today: Date;
  clientColorMap: Map<string, { chip: string; dot: string }>;
  onDeleteEvent: (id: string) => void;
}

function CalendarGrid({ year, month, tasksByDate, eventsByDate, today, clientColorMap, onDeleteEvent }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);
  const prevMonth = month - 1 < 0 ? 11 : month - 1;
  const prevYear = month - 1 < 0 ? year - 1 : year;
  const nextMonth = month + 1 > 11 ? 0 : month + 1;
  const nextYear = month + 1 > 11 ? year + 1 : year;

  const cells: { day: number; m: number; y: number; current: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, m: prevMonth, y: prevYear, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, m: month, y: year, current: true });
  }
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
        const dayEvents = eventsByDate.get(key) ?? [];
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
              {dayEvents.map((ev) => (
                <EventChip key={ev.id} event={ev} onDelete={onDeleteEvent} />
              ))}
              {visible.map((t) => (
                <TaskChip
                  key={t.id}
                  task={t}
                  color={clientColorMap.get(t.user.id) ?? CLIENT_COLORS[0]}
                />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted-foreground px-1">+{overflow} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile list view ─────────────────────────────────────────────────

function MobileListView({
  year,
  month,
  tasksByDate,
  clientColorMap,
}: {
  year: number;
  month: number;
  tasksByDate: Map<string, Task[]>;
  clientColorMap: Map<string, { chip: string; dot: string }>;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date();
  const entries: { day: number; tasks: Task[] }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    const tasks = tasksByDate.get(key) ?? [];
    if (tasks.length > 0) entries.push({ day: d, tasks });
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
              {tasks.map((t) => (
                <TaskChip key={t.id} task={t} color={clientColorMap.get(t.user.id) ?? CLIENT_COLORS[0]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Derive unique clients ─────────────────────────────────────────────

function buildClientColorMap(tasks: Task[]): Map<string, { chip: string; dot: string }> {
  const map = new Map<string, { chip: string; dot: string }>();
  let idx = 0;
  for (const t of tasks) {
    if (!map.has(t.user.id)) {
      map.set(t.user.id, CLIENT_COLORS[idx % CLIENT_COLORS.length]);
      idx++;
    }
  }
  return map;
}

// ── Main page ────────────────────────────────────────────────────────

export default function AdminCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);

  // Calendar layers + events
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [newCalName, setNewCalName] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [evForm, setEvForm] = useState({ calendarId: "", title: "", date: "", endDate: "", recurrence: "" });

  const loadCalendars = useCallback(async () => {
    const res = await fetch("/api/calendars");
    if (res.ok) {
      const data = await res.json();
      const list: Cal[] = data.calendars || [];
      setCalendars(list);
      setEnabled((prev) => prev.size === 0 ? new Set(list.map((c) => c.id)) : prev);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/calendar-events");
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events || []);
    }
  }, []);

  useEffect(() => { loadCalendars(); loadEvents(); }, [loadCalendars, loadEvents]);

  const createCalendar = async () => {
    const name = newCalName.trim();
    if (!name) return;
    const palette = ["#6366f1", "#0ea5e9", "#10b981", "#f43f5e", "#f59e0b", "#d946ef", "#14b8a6", "#f97316"];
    const color = palette[calendars.length % palette.length];
    const res = await fetch("/api/calendars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
    if (res.ok) {
      const { calendar } = await res.json();
      setNewCalName("");
      setEnabled((prev) => new Set(prev).add(calendar.id));
      loadCalendars();
    }
  };

  const deleteCalendar = async (id: string) => {
    await fetch(`/api/calendars/${id}`, { method: "DELETE" });
    loadCalendars();
    loadEvents();
  };

  const createEvent = async () => {
    if (!evForm.calendarId || !evForm.title.trim() || !evForm.date) return;
    const res = await fetch("/api/calendar-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(evForm) });
    if (res.ok) {
      setEvForm({ calendarId: evForm.calendarId, title: "", date: "", endDate: "", recurrence: "" });
      setShowEventForm(false);
      loadEvents();
    }
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleCalendar = (id: string) => {
    setEnabled((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Events grouped by date, filtered to enabled layers.
  const eventsByDate = (() => {
    const m = new Map<string, CalEvent[]>();
    for (const ev of events) {
      if (!enabled.has(ev.calendar.id)) continue;
      const d = new Date(ev.date);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(ev);
    }
    return m;
  })();

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
        const all: Task[] = (data.tasks ?? []).filter((t: Task) => !!t.dueDate && !!t.user);
        setTasks(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Build unique clients list from tasks
  const clients: { id: string; label: string }[] = [];
  const seenClients = new Set<string>();
  for (const t of tasks) {
    if (!seenClients.has(t.user.id)) {
      seenClients.add(t.user.id);
      clients.push({ id: t.user.id, label: t.user.companyName || t.user.name });
    }
  }
  clients.sort((a, b) => a.label.localeCompare(b.label));

  // Client color map (based on all tasks, not filtered, so colors are stable)
  const clientColorMap = buildClientColorMap(tasks);

  // Apply filter
  const filteredTasks = filterClient === "all" ? tasks : tasks.filter((t) => t.user.id === filterClient);

  // Build tasksByDate
  const tasksByDate = useCallback((): Map<string, Task[]> => {
    const map = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks]);

  const map = tasksByDate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Client filter bar */}
      {!loading && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterClient("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filterClient === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            All clients
          </button>
          {clients.map((c) => {
            const color = clientColorMap.get(c.id) ?? CLIENT_COLORS[0];
            const active = filterClient === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilterClient(c.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  active ? color.chip : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendars (layers) bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-medium text-muted-foreground">Calendars:</span>
        {calendars.map((c) => (
          <span key={c.id} className="inline-flex items-center group">
            <button
              onClick={() => toggleCalendar(c.id)}
              className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                enabled.has(c.id) ? "border-transparent text-white" : "border-border text-muted-foreground bg-transparent")}
              style={enabled.has(c.id) ? { backgroundColor: c.color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: enabled.has(c.id) ? "#fff" : c.color }} />
              {c.name}
            </button>
            <button onClick={() => deleteCalendar(c.id)} title="Delete calendar" className="ml-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={newCalName}
          onChange={(e) => setNewCalName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createCalendar()}
          placeholder="New calendar"
          className="h-7 text-xs border border-input rounded px-2 bg-background text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={createCalendar} disabled={!newCalName.trim()} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-50">+ Add</button>
        {calendars.length > 0 && (
          <button onClick={() => { setShowEventForm((s) => !s); setEvForm((f) => ({ ...f, calendarId: f.calendarId || calendars[0].id })); }} className="ml-auto text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground font-medium">
            + New event
          </button>
        )}
      </div>

      {/* New event form */}
      {showEventForm && calendars.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 mb-4 p-3 border border-border rounded-lg bg-muted/30">
          <select value={evForm.calendarId} onChange={(e) => setEvForm((f) => ({ ...f, calendarId: e.target.value }))} className="text-sm border border-input rounded px-2 py-1.5 bg-background text-foreground">
            {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={evForm.title} onChange={(e) => setEvForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title" className="text-sm border border-input rounded px-2 py-1.5 bg-background text-foreground flex-1 min-w-[160px]" />
          <label className="flex flex-col text-[10px] text-muted-foreground">Start
            <input type="date" value={evForm.date} onChange={(e) => setEvForm((f) => ({ ...f, date: e.target.value }))} className="text-sm border border-input rounded px-2 py-1.5 bg-background text-foreground" />
          </label>
          <label className="flex flex-col text-[10px] text-muted-foreground">End (optional)
            <input type="date" value={evForm.endDate} min={evForm.date} onChange={(e) => setEvForm((f) => ({ ...f, endDate: e.target.value }))} className="text-sm border border-input rounded px-2 py-1.5 bg-background text-foreground" />
          </label>
          <label className="flex flex-col text-[10px] text-muted-foreground">Repeat
            <select value={evForm.recurrence} onChange={(e) => setEvForm((f) => ({ ...f, recurrence: e.target.value }))} className="text-sm border border-input rounded px-2 py-1.5 bg-background text-foreground">
              <option value="">Does not repeat</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <button onClick={createEvent} disabled={!evForm.title.trim() || !evForm.date} className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50">Add event</button>
          <button onClick={() => setShowEventForm(false)} className="text-sm px-3 py-1.5 rounded-md border border-border">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading calendar…
        </div>
      ) : isMobile ? (
        <MobileListView year={year} month={month} tasksByDate={map} clientColorMap={clientColorMap} />
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-border">
          <CalendarGrid year={year} month={month} tasksByDate={map} eventsByDate={eventsByDate} today={today} clientColorMap={clientColorMap} onDeleteEvent={deleteEvent} />
        </div>
      )}
    </div>
  );
}
