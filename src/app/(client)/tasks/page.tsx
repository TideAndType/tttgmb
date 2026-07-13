"use client";

import { useEffect, useState } from "react";
import { TaskCard } from "@/components/tasks/task-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwipeRow } from "@/components/ui/swipe-row";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { CheckSquare, RotateCcw, Check } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  color?: string | null;
  tags?: string[];
  todos?: { id: string; text: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
  links?: { id: string; url: string; label: string }[];
  assignees?: { user: { id: string; name: string } }[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      }
    } catch {
      // silently fail
    }
    setUpdating(null);
  };

  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <PullToRefresh onRefresh={fetchTasks}>
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
        <p className="text-muted-foreground mt-1">Your to-do list from your account team</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Your account team will assign tasks here when there&apos;s something for you to review or action.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="todo">
          <TabsList className="mb-6">
            <TabsTrigger value="todo">
              To Do
              {activeTasks.length > 0 && (
                <span className="ml-2 bg-primary/15 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {activeTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {completedTasks.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {completedTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo">
            {activeTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>All tasks complete — great work!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <SwipeRow
                    key={task.id}
                    actions={[{ label: "Done", icon: <Check className="h-4 w-4" />, className: "bg-green-600 text-white", onAction: () => handleStatusChange(task.id, "COMPLETED") }]}
                  >
                    <TaskCard task={task} onStatusChange={handleStatusChange} loading={updating === task.id} />
                  </SwipeRow>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No completed tasks yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <SwipeRow
                    key={task.id}
                    actions={[{ label: "Reopen", icon: <RotateCcw className="h-4 w-4" />, className: "bg-primary text-primary-foreground", onAction: () => handleStatusChange(task.id, "PENDING") }]}
                  >
                    <TaskCard task={task} onStatusChange={handleStatusChange} loading={updating === task.id} />
                  </SwipeRow>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
    </PullToRefresh>
  );
}
