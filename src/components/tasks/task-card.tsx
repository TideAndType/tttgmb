"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, AlertCircle, MessageSquare } from "lucide-react";

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

interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
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

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(task.commentCount ?? 0);

  const handleToggleComments = async () => {
    if (!commentsOpen && !commentsFetched) {
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/tasks/${task.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
          setCommentCount(data.comments?.length ?? commentCount);
          setCommentsFetched(true);
        }
      } catch {
        // silently fail
      }
      setCommentsLoading(false);
    }
    setCommentsOpen((prev) => !prev);
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        // Refresh comments
        const listRes = await fetch(`/api/tasks/${task.id}/comments`);
        if (listRes.ok) {
          const data = await listRes.json();
          setComments(data.comments || []);
          setCommentCount(data.comments?.length ?? commentCount);
        }
      }
    } catch {
      // silently fail
    }
    setPostLoading(false);
  };

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
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleComments}
              className="text-xs h-7 gap-1 text-muted-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments ({commentCount})
            </Button>
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

        {commentsOpen && (
          <div className="mt-4 border-t border-border pt-4 space-y-4">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{c.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              />
              <Button
                size="sm"
                onClick={handlePostComment}
                disabled={postLoading || !newComment.trim()}
              >
                {postLoading ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
