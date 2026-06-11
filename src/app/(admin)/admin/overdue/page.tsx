"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CheckCircle2, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string;
  user: { id: string; name: string; companyName?: string | null };
}

const priorityConfig = {
  HIGH: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const statusConfig = {
  PENDING: { label: "Pending", className: "" },
  IN_PROGRESS: { label: "In Progress", className: "" },
  COMPLETED: { label: "Completed", className: "" },
};

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OverduePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchOverdue();
  }, []);

  const fetchOverdue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      const allTasks: Task[] = data.tasks || [];
      const now = new Date();
      const overdue = allTasks.filter(
        (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now
      );
      setTasks(overdue);
    } catch {
      setError("Failed to load tasks");
    }
    setLoading(false);
  };

  const handleComplete = async (id: string) => {
    setCompleting(id);
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      setError("Failed to mark complete");
    }
    setCompleting(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    setDeleting(id);
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      setError("Failed to delete task");
    }
    setDeleting(null);
  };

  // Group by client
  const grouped: Map<string, { label: string; tasks: Task[] }> = new Map();
  for (const task of tasks) {
    const key = task.user.id;
    const label = task.user.companyName || task.user.name;
    if (!grouped.has(key)) {
      grouped.set(key, { label, tasks: [] });
    }
    grouped.get(key)!.tasks.push(task);
  }

  // Sort groups by label
  const sortedGroups = Array.from(grouped.entries()).sort(([, a], [, b]) =>
    a.label.localeCompare(b.label)
  );

  // Sort tasks within each group by most overdue first
  for (const [, group] of sortedGroups) {
    group.tasks.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Overdue Tasks</h1>
            {!loading && tasks.length > 0 && (
              <span className="bg-red-100 text-red-700 border border-red-200 text-sm font-semibold px-2.5 py-0.5 rounded-full">
                {tasks.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">All tasks past their due date</p>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-5 bg-green-100 rounded-full mb-5">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No overdue tasks</h3>
          <p className="text-muted-foreground">Everything is on track!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([userId, group]) => (
            <div key={userId}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-foreground">
                  {group.label}
                </h2>
                <span className="text-muted-foreground text-sm">
                  — {group.tasks.length} overdue {group.tasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              <div className="space-y-3">
                {group.tasks.map((task) => {
                  const days = daysOverdue(task.dueDate);
                  const veryOverdue = days > 7;
                  const priority = priorityConfig[task.priority];
                  const status = statusConfig[task.status];

                  return (
                    <Card key={task.id}>
                      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-semibold",
                              veryOverdue ? "text-red-700" : "text-foreground"
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full border",
                              priority.className
                            )}
                          >
                            {priority.label}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="h-3 w-3" />
                            Due {formatDate(task.dueDate)} · {days} {days === 1 ? "day" : "days"} overdue
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 gap-1"
                              onClick={() => handleComplete(task.id)}
                              disabled={completing === task.id}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              onClick={() => handleDelete(task.id)}
                              disabled={deleting === task.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
