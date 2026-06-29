"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, AlertCircle, Trash2, Eye, EyeOff, ExternalLink, X, Link2, Users, ChevronDown, ChevronUp, Tag, Download, Repeat } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TaskTodoList } from "@/components/tasks/task-todo-list";
import { CommentThread } from "@/components/comments/comment-thread";
import { TimeLogger } from "@/components/time/time-logger";

interface TaskLink { id: string; url: string; label: string; }
interface Assignee { user: { id: string; name: string }; }
interface Todo { id: string; text: string; done: boolean; }

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  visibleToClient: boolean;
  recurrence?: string | null;
  color?: string | null;
  tags?: string[];
  todos?: Todo[];
  userId: string;
  user: { id: string; name: string; companyName?: string | null };
  links?: TaskLink[];
  assignees?: Assignee[];
  commentCount?: number;
  projectId?: string | null;
  timeMinutes?: number;
}

interface ProjectOption { id: string; name: string; userId: string; }

interface TeamMember { id: string; name: string; email: string; }

const COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#f97316", label: "Orange" },
  { value: "#64748b", label: "Slate" },
];

function getLinkIcon(url: string) {
  if (url.includes("figma.com")) return <span className="font-bold text-purple-600">Fg</span>;
  if (url.includes("docs.google.com")) return <span className="font-bold text-blue-600">GDoc</span>;
  if (url.includes("dropbox.com")) return <span className="font-bold text-blue-500">DB</span>;
  if (url.includes("drive.google.com")) return <span className="font-bold text-green-600">GDrive</span>;
  return <ExternalLink className="h-3 w-3" />;
}

function hashColor(id: string): string {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const priorityConfig = {
  HIGH: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
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

  // Assignee panel state
  const [expandedAssignees, setExpandedAssignees] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);
  const [addingAssignee, setAddingAssignee] = useState<string | null>(null);
  const [removingAssignee, setRemovingAssignee] = useState<string | null>(null);

  // Tags/color panel
  const [expandedLabels, setExpandedLabels] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => { fetchTasks(); fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.projects ?? [];
      setProjectOptions(list.map((p: any) => ({ id: p.id, name: p.name, userId: p.userId })));
    } catch { /* ignore */ }
  };

  const handleSetProject = async (taskId: string, projectId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: projectId || null }),
    });
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, projectId: projectId || null } : t));
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { setError("Failed to load tasks"); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    setDeleting(id);
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    else setError("Failed to delete task");
    setDeleting(null);
  };

  const handleAddLink = async (taskId: string) => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim(), label: linkLabel.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, links: [...(t.links || []), data.link] } : t));
        setLinkLabel(""); setLinkUrl(""); setAddingLinkFor(null);
      } else setError("Failed to add link");
    } catch { setError("Failed to add link"); }
    setSavingLink(false);
  };

  const handleDeleteLink = async (taskId: string, linkId: string) => {
    setDeletingLink(linkId);
    const res = await fetch(`/api/tasks/${taskId}/links?linkId=${linkId}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, links: (t.links || []).filter((l) => l.id !== linkId) } : t));
    else setError("Failed to delete link");
    setDeletingLink(null);
  };

  const handleToggleVisibility = async (task: Task) => {
    setTogglingVisibility(task.id);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToClient: !task.visibleToClient }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, visibleToClient: data.task.visibleToClient } : t)));
    }
    setTogglingVisibility(null);
  };

  const handleSetColor = async (taskId: string, color: string | null) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (res.ok) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, color } : t));
  };

  const handleAddTag = async (taskId: string, currentTags: string[]) => {
    const tag = tagInput.trim();
    if (!tag || currentTags.includes(tag)) return;
    setSavingTag(true);
    const newTags = [...currentTags, tag];
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, tags: newTags } : t));
      setTagInput("");
    }
    setSavingTag(false);
  };

  const handleRemoveTag = async (taskId: string, currentTags: string[], tagToRemove: string) => {
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, tags: newTags } : t));
  };

  const handleToggleAssigneePanel = async (task: Task) => {
    if (expandedAssignees === task.id) { setExpandedAssignees(null); return; }
    setExpandedAssignees(task.id);
    if (!teamMembers[task.userId]) {
      setLoadingMembers(task.userId);
      try {
        const res = await fetch(`/api/admin/clients/${task.userId}/members`);
        const data = await res.json();
        setTeamMembers((prev) => ({ ...prev, [task.userId]: data.members || [] }));
      } catch { /* ignore */ }
      setLoadingMembers(null);
    }
  };

  const handleAddAssignee = async (taskId: string, userId: string) => {
    setAddingAssignee(userId);
    const res = await fetch(`/api/tasks/${taskId}/assignees`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, assignees: [...(t.assignees || []), data.assignee] } : t));
    }
    setAddingAssignee(null);
  };

  const handleRemoveAssignee = async (taskId: string, userId: string) => {
    setRemovingAssignee(userId);
    const res = await fetch(`/api/tasks/${taskId}/assignees`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, assignees: (t.assignees || []).filter((a) => a.user.id !== userId) } : t));
    setRemovingAssignee(null);
  };

  const clients = Array.from(new Map(tasks.map((t) => [t.user.id, t.user])).values());
  const filtered = filterClient === "all" ? tasks : tasks.filter((t) => t.user.id === filterClient);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage tasks across all clients</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/tasks/export">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export CSV</Button>
          </a>
          <Link href="/admin/tasks/new">
            <Button className="gap-2"><Plus className="h-4 w-4" />New Task</Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {clients.length > 1 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button onClick={() => setFilterClient("all")} className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", filterClient === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50")}>
            All clients ({tasks.length})
          </button>
          {clients.map((c) => {
            const count = tasks.filter((t) => t.user.id === c.id).length;
            return (
              <button key={c.id} onClick={() => setFilterClient(c.id)} className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", filterClient === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50")}>
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
            <Link href="/admin/tasks/new"><Button>Create First Task</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const priority = priorityConfig[task.priority];
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && task.status !== "COMPLETED";
            const isAssigneeExpanded = expandedAssignees === task.id;
            const isLabelsExpanded = expandedLabels === task.id;
            const members = teamMembers[task.userId] || [];
            const currentAssigneeIds = new Set((task.assignees || []).map((a) => a.user.id));
            const availableToAdd = members.filter((m) => !currentAssigneeIds.has(m.id));
            const taskTags = task.tags || [];

            return (
              <Card key={task.id} className={cn("overflow-hidden", task.status === "COMPLETED" && "opacity-60")}>
                <div className="flex">
                  {task.color && <div className="w-1 flex-shrink-0" style={{ backgroundColor: task.color }} />}
                  <div className="flex-1 min-w-0">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs font-normal">{task.user.companyName || task.user.name}</Badge>
                          <Badge variant={task.status === "COMPLETED" ? "default" : "outline"} className="text-xs">
                            {task.status === "PENDING" ? "Pending" : task.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
                          </Badge>
                          {!task.visibleToClient && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">Hidden from client</Badge>
                          )}
                          {taskTags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {tag}
                              <button onClick={() => handleRemoveTag(task.id, taskTags, tag)} className="hover:text-red-500 transition-colors">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <p className={cn("font-semibold text-foreground", task.status === "COMPLETED" && "line-through")}>{task.title}</p>
                        {task.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                        {task.assignees && task.assignees.length > 1 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {task.assignees.map((a) => (
                              <span key={a.user.id} title={a.user.name} className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ backgroundColor: hashColor(a.user.id) }}>
                                {a.user.name[0].toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", priority.className)}>{priority.label}</span>
                        <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", task.visibleToClient ? "text-teal-600" : "text-muted-foreground")} onClick={() => handleToggleVisibility(task)} disabled={togglingVisibility === task.id} title={task.visibleToClient ? "Visible — click to hide" : "Hidden — click to show"}>
                          {task.visibleToClient ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(task.id)} disabled={deleting === task.id}>
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
                      {task.recurrence && (
                        <span className="flex items-center gap-1 text-xs mb-3 text-muted-foreground capitalize">
                          <Repeat className="h-3 w-3" />
                          Repeats {task.recurrence}
                        </span>
                      )}

                      {/* Links */}
                      {task.links && task.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.links.map((link) => (
                            <span key={link.id} className="inline-flex items-center gap-1 text-xs border border-primary/30 rounded px-2 py-0.5 bg-primary/5">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                {getLinkIcon(link.url)}{link.label}
                              </a>
                              <button onClick={() => handleDeleteLink(task.id, link.id)} disabled={deletingLink === link.id} className="ml-1 text-muted-foreground hover:text-red-600 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {addingLinkFor === task.id ? (
                        <div className="flex items-center gap-2 mt-2 mb-3">
                          <Input placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="h-7 text-xs w-28" />
                          <Input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-7 text-xs flex-1" />
                          <Button size="sm" className="h-7 text-xs px-3" onClick={() => handleAddLink(task.id)} disabled={savingLink || !linkLabel.trim() || !linkUrl.trim()}>{savingLink ? "..." : "Add"}</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setAddingLinkFor(null); setLinkLabel(""); setLinkUrl(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground mb-2" onClick={() => { setAddingLinkFor(task.id); setLinkLabel(""); setLinkUrl(""); }}>
                          <Link2 className="h-3 w-3 mr-1" />Add link
                        </Button>
                      )}

                      {/* To-dos */}
                      <TaskTodoList taskId={task.id} initialTodos={task.todos || []} canAdd />

                      {/* Labels / color / tags panel */}
                      <div className="mt-2 border-t pt-2">
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setExpandedLabels(isLabelsExpanded ? null : task.id)}>
                          <Tag className="h-3 w-3" />
                          Labels & Color
                          {isLabelsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {isLabelsExpanded && (
                          <div className="mt-2 space-y-3">
                            {/* Color picker */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Color stripe</p>
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => handleSetColor(task.id, null)} className={cn("w-5 h-5 rounded-full border-2 bg-muted", !task.color ? "border-foreground" : "border-transparent hover:border-muted-foreground")} title="No color" />
                                {COLORS.map((c) => (
                                  <button key={c.value} onClick={() => handleSetColor(task.id, task.color === c.value ? null : c.value)} className={cn("w-5 h-5 rounded-full border-2", task.color === c.value ? "border-foreground" : "border-transparent hover:border-muted-foreground")} style={{ backgroundColor: c.value }} title={c.label} />
                                ))}
                              </div>
                            </div>
                            {/* Tag input */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(task.id, taskTags); }}
                                  placeholder="Add tag..."
                                  className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-32"
                                />
                                <button onClick={() => handleAddTag(task.id, taskTags)} disabled={savingTag || !tagInput.trim()} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50">
                                  {savingTag ? "..." : "Add"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assignees section */}
                      <div className="mt-2 border-t pt-2">
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => handleToggleAssigneePanel(task)}>
                          <Users className="h-3 w-3" />
                          Assignees ({(task.assignees || []).length})
                          {isAssigneeExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {isAssigneeExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {(task.assignees || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No assignees yet.</p>
                            ) : (
                              (task.assignees || []).map((a) => (
                                <div key={a.user.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium text-white flex-shrink-0" style={{ backgroundColor: hashColor(a.user.id) }}>
                                      {a.user.name[0].toUpperCase()}
                                    </span>
                                    <span className="text-xs">{a.user.name}</span>
                                    {a.user.id === task.userId && <span className="text-xs text-muted-foreground">(owner)</span>}
                                  </div>
                                  {a.user.id !== task.userId && (
                                    <button className="text-muted-foreground hover:text-red-600 transition-colors" onClick={() => handleRemoveAssignee(task.id, a.user.id)} disabled={removingAssignee === a.user.id}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                            {loadingMembers === task.userId ? (
                              <p className="text-xs text-muted-foreground">Loading team members...</p>
                            ) : availableToAdd.length > 0 ? (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Add assignee:</p>
                                <div className="flex flex-wrap gap-1">
                                  {availableToAdd.map((m) => (
                                    <button key={m.id} onClick={() => handleAddAssignee(task.id, m.id)} disabled={addingAssignee === m.id} className="inline-flex items-center gap-1 text-xs border border-dashed border-muted-foreground/40 rounded px-2 py-0.5 hover:border-primary hover:text-primary transition-colors">
                                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-medium text-white flex-shrink-0" style={{ backgroundColor: hashColor(m.id) }}>
                                        {m.name[0].toUpperCase()}
                                      </span>
                                      {m.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Time tracking — agency logs time against the task; rolls up to the project */}
                      <div className="mt-2 border-t pt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Project:</span>
                          <select
                            value={task.projectId || ""}
                            onChange={(e) => handleSetProject(task.id, e.target.value)}
                            className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                          >
                            <option value="">— No project —</option>
                            {projectOptions.filter((p) => p.userId === task.userId).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <TimeLogger taskId={task.id} projectId={task.projectId || undefined} />
                      </div>

                      {/* Comments — shared with the client side so agency sees client replies */}
                      <div className="mt-2 border-t pt-2">
                        <CommentThread commentsUrl={`/api/tasks/${task.id}/comments`} initialCount={task.commentCount ?? 0} />
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
