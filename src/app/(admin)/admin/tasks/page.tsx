"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, AlertCircle, Trash2, Eye, EyeOff, ExternalLink, X, Link2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TaskLink {
  id: string;
  url: string;
  label: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  visibleToClient: boolean;
  user: { id: string; name: string; companyName?: string | null };
  links?: TaskLink[];
}

function getLinkIcon(url: string) {
  if (url.includes("figma.com")) {
    return <span className="font-bold text-purple-600">Fg</span>;
  }
  if (url.includes("docs.google.com")) {
    return <span className="font-bold text-blue-600">GDoc</span>;
  }
  if (url.includes("dropbox.com")) {
    return <span className="font-bold text-blue-500">DB</span>;
  }
  if (url.includes("drive.google.com")) {
    return <span className="font-bold text-green-600">GDrive</span>;
  }
  return <ExternalLink className="h-3 w-3" />;
}

const priorityConfig = {
  HIGH: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);
  const [addingLinkFor, setAddingLinkFor] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [deletingLink, setDeletingLink] = useState<string | null>(null);

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
      setError("Failed to load tasks");
    }
    setLoading(false);
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

  const handleAddLink = async (taskId: string) => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim(), label: linkLabel.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, links: [...(t.links || []), data.link] } : t
          )
        );
        setLinkLabel("");
        setLinkUrl("");
        setAddingLinkFor(null);
      } else {
        setError("Failed to add link");
      }
    } catch {
      setError("Failed to add link");
    }
    setSavingLink(false);
  };

  const handleDeleteLink = async (taskId: string, linkId: string) => {
    setDeletingLink(linkId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/links?linkId=${linkId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, links: (t.links || []).filter((l) => l.id !== linkId) } : t
          )
        );
      } else {
        setError("Failed to delete link");
      }
    } catch {
      setError("Failed to delete link");
    }
    setDeletingLink(null);
  };

  const handleToggleVisibility = async (task: Task) => {
    setTogglingVisibility(task.id);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToClient: !task.visibleToClient }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, visibleToClient: data.task.visibleToClient } : t)));
    } else {
      setError("Failed to update visibility");
    }
    setTogglingVisibility(null);
  };

  // Unique clients for filter
  const clients = Array.from(
    new Map(tasks.map((t) => [t.user.id, t.user])).values()
  );

  const filtered = filterClient === "all" ? tasks : tasks.filter((t) => t.user.id === filterClient);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage tasks across all clients</p>
        </div>
        <Link href="/admin/tasks/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {/* Client filter */}
      {clients.length > 1 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterClient("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              filterClient === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            All clients ({tasks.length})
          </button>
          {clients.map((c) => {
            const count = tasks.filter((t) => t.user.id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setFilterClient(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  filterClient === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {c.companyName || c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No tasks yet.</p>
            <Link href="/admin/tasks/new">
              <Button>Create First Task</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const priority = priorityConfig[task.priority];
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && task.status !== "COMPLETED";

            return (
              <Card key={task.id} className={cn(task.status === "COMPLETED" && "opacity-60")}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs font-normal">
                        {task.user.companyName || task.user.name}
                      </Badge>
                      <Badge variant={task.status === "COMPLETED" ? "default" : "outline"} className="text-xs">
                        {task.status === "PENDING" ? "Pending" : task.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
                      </Badge>
                      {!task.visibleToClient && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                          Hidden from client
                        </Badge>
                      )}
                    </div>
                    <p className={cn("font-semibold text-foreground", task.status === "COMPLETED" && "line-through")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", priority.className)}>
                      {priority.label}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 p-0",
                        task.visibleToClient ? "text-teal-600 hover:text-teal-700" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleToggleVisibility(task)}
                      disabled={togglingVisibility === task.id}
                      title={task.visibleToClient ? "Visible to client — click to hide" : "Hidden from client — click to show"}
                    >
                      {task.visibleToClient ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
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
                </CardHeader>
                <CardContent>
                  {dueDate && (
                    <span className={cn("flex items-center gap-1 text-xs mb-3", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                      {isOverdue && <AlertCircle className="h-3 w-3" />}
                      <CalendarDays className="h-3 w-3" />
                      Due {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {/* Links */}
                  {task.links && task.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {task.links.map((link) => (
                        <span key={link.id} className="inline-flex items-center gap-1 text-xs border border-primary/30 rounded px-2 py-0.5 bg-primary/5">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            {getLinkIcon(link.url)}
                            {link.label}
                          </a>
                          <button
                            onClick={() => handleDeleteLink(task.id, link.id)}
                            disabled={deletingLink === link.id}
                            className="ml-1 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Remove link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Add link form */}
                  {addingLinkFor === task.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Label"
                        value={linkLabel}
                        onChange={(e) => setLinkLabel(e.target.value)}
                        className="h-7 text-xs w-28"
                      />
                      <Input
                        placeholder="https://..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => handleAddLink(task.id)}
                        disabled={savingLink || !linkLabel.trim() || !linkUrl.trim()}
                      >
                        {savingLink ? "..." : "Add"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => { setAddingLinkFor(null); setLinkLabel(""); setLinkUrl(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground mt-1"
                      onClick={() => { setAddingLinkFor(task.id); setLinkLabel(""); setLinkUrl(""); }}
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      Add link
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
