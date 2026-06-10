"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Play, Pause, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
}

interface TimeEntry {
  id: string;
  date: string;
  minutes: number;
  description?: string | null;
  project?: { id: string; name: string; color: string } | null;
  task?: { id: string; title: string } | null;
}

function getTodayString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export default function TimePage() {
  // Form state
  const [date, setDate] = useState(getTodayString());
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [projRes, taskRes, entriesRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/tasks"),
        fetch("/api/time?days=30"),
      ]);
      const projData = await projRes.json();
      const taskData = await taskRes.json();
      const entriesData = await entriesRes.json();
      setProjects(Array.isArray(projData) ? projData : []);
      setTasks(taskData.tasks || []);
      setEntries(entriesData.entries || []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    if (totalMinutes < 1) {
      setFormError("Please enter a duration greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          description: description || undefined,
          minutes: totalMinutes,
          date: date ? new Date(date).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error || "Failed to log time.");
      } else {
        setHours("0");
        setMinutes("0");
        setDescription("");
        setProjectId("");
        setTaskId("");
        setDate(getTodayString());
        await fetchAll();
      }
    } catch {
      setFormError("Failed to log time.");
    }
    setSubmitting(false);
  };

  const handleTimerStop = () => {
    setTimerRunning(false);
    const totalMins = Math.round(timerSeconds / 60);
    if (totalMins > 0) {
      setHours(String(Math.floor(totalMins / 60)));
      setMinutes(String(totalMins % 60));
    }
    setTimerSeconds(0);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/time/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // silently fail
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Group entries by date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const d = new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!acc[d]) acc[d] = [];
    acc[d].push(entry);
    return acc;
  }, {});

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthMinutes = entries
    .filter((e) => new Date(e.date) >= startOfMonth)
    .reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Time Tracking</h1>
        <p className="text-muted-foreground mt-1">Log your time and track hours across projects</p>
      </div>

      {/* Log Time Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Time</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Duration</label>
                <div className="flex gap-2">
                  <select
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i}h</option>
                    ))}
                  </select>
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{m}m</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Task</label>
                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What did you work on?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Logging..." : "Log Time"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Timer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="font-mono text-4xl font-bold text-foreground tabular-nums">
              {formatTimer(timerSeconds)}
            </div>
            <div className="flex gap-2">
              {!timerRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimerRunning(true)}
                  disabled={timerRunning}
                >
                  <Play className="h-4 w-4 mr-1" /> Start
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimerRunning(false)}
                >
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTimerStop}
                disabled={timerSeconds === 0}
              >
                <Square className="h-4 w-4 mr-1" /> Stop
              </Button>
            </div>
            {timerSeconds > 0 && !timerRunning && (
              <p className="text-sm text-muted-foreground">Timer stopped — duration filled in the form above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Log Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Time Log</h2>
          {thisMonthMinutes > 0 && (
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              This month: <span className="font-semibold text-foreground">{formatMinutes(thisMonthMinutes)}</span>
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading entries...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No time logged yet</h3>
            <p className="text-muted-foreground text-sm">Use the form above to log your first entry.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, dayEntries]) => {
              const dayTotal = dayEntries.reduce((sum, e) => sum + e.minutes, 0);
              return (
                <div key={dateLabel}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{dateLabel}</h3>
                    <span className="text-sm font-medium text-foreground">{formatMinutes(dayTotal)}</span>
                  </div>
                  <Card>
                    <div className="divide-y divide-border">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-14 text-sm font-medium text-foreground shrink-0">
                            {formatMinutes(entry.minutes)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {entry.project && (
                              <span
                                className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mr-2"
                                style={{
                                  backgroundColor: entry.project.color + "22",
                                  color: entry.project.color,
                                }}
                              >
                                {entry.project.name}
                              </span>
                            )}
                            {entry.task && (
                              <span className="text-xs text-muted-foreground mr-2">{entry.task.title}</span>
                            )}
                            {entry.description && (
                              <span className="text-sm text-foreground truncate block mt-0.5">{entry.description}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
