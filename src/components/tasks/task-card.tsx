"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, AlertCircle } from "lucide-react";
import { CommentThread } from "@/components/comments/comment-thread";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  commentCount?: number;
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  loading?: boolean;
}

const priorityConfig = {
  HIGH: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function TaskCard({ task, onStatusChange, loading }: TaskCardProps) {
  const priority = priorityConfig[task.priority];

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== "COMPLETED";

  const formatDueDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const nextStatus =
    task.status === "PENDING"
      ? "IN_PROGRESS"
      : task.status === "IN_PROGRESS"
      ? "COMPLETED"
      : null;

  const nextLabel =
    task.status === "PENDING"
      ? "Mark In Progress"
      : task.status === "IN_PROGRESS"
      ? "Mark Complete"
      : null;

  return (
    <Card className={cn("transition-colors", task.status === "COMPLETED" && "opacity-60")}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-foreground", task.status === "COMPLETED" && "line-through")}>{task.title}</p>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0", priority.className)}>
          {priority.label}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {dueDate && (
              <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                {isOverdue && <AlertCircle className="h-3 w-3" />}
                <CalendarDays className="h-3 w-3" />
                Due {formatDueDate(dueDate)}
              </span>
            )}
            <Badge variant={task.status === "COMPLETED" ? "default" : "outline"} className="text-xs">
              {task.status === "PENDING" ? "Pending" : task.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CommentThread
              commentsUrl={`/api/tasks/${task.id}/comments`}
              initialCount={task.commentCount ?? 0}
            />
            {nextStatus && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(task.id, nextStatus)}
                disabled={loading}
                className="text-xs h-7"
              >
                {nextLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
