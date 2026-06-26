"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, MessageSquare, LayoutGrid, Trash2, Settings2, X, CalendarDays, ChevronDown, ChevronUp, LayoutTemplate, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  visibility: string;
  memberIds: string[];
  userId: string;
  user: { name: string; companyName: string | null };
  _count: { messages: number; cards: number };
  ratingAvg: number | null;
  ratingCount: number;
}

interface Member { id: string; name: string; email: string; }
interface Template { id: string; name: string; description: string | null; }

interface VisibilityState {
  project: Project;
  visibility: string;
  memberIds: string[];
  members: Member[];
  saving: boolean;
}

const STATUS_OPTIONS = [
  { value: "active",    label: "Active",     className: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "on_track",  label: "On Track",   className: "bg-green-100 text-green-700 border-green-200" },
  { value: "at_risk",   label: "At Risk",    className: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "blocked",   label: "Blocked",    className: "bg-red-100 text-red-700 border-red-200" },
  { value: "on_hold",   label: "On Hold",    className: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "completed", label: "Completed",  className: "bg-violet-100 text-violet-700 border-violet-200" },
];

function statusConfig(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState("all");
  const [visDialog, setVisDialog] = useState<VisibilityState | null>(null);
  const [expandedDates, setExpandedDates] = useState<string | null>(null);
  const [savingDates, setSavingDates] = useState<string | null>(null);
  const [dateEdits, setDateEdits] = useState<Record<string, { startDate: string; dueDate: string }>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  useEffect(() => { fetchProjects(); fetchTemplates(); }, []);

  const fetchProjects = () => {
    setLoading(true);
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  const fetchTemplates = () => {
    fetch("/api/project-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const handleSaveAsTemplate = async (project: Project) => {
    const name = window.prompt(`Save "${project.name}" as a reusable template. Template name:`, project.name);
    if (!name) return;
    setSavingTemplate(project.id);
    const res = await fetch("/api/project-templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fromProjectId: project.id }),
    });
    setSavingTemplate(null);
    if (res.ok) { fetchTemplates(); setShowTemplates(true); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/project-templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its data?")) return;
    setDeleting(id);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

  const toggleDatesPanel = (project: Project) => {
    if (expandedDates === project.id) { setExpandedDates(null); return; }
    setExpandedDates(project.id);
    setDateEdits((prev) => ({
      ...prev,
      [project.id]: { startDate: toInputDate(project.startDate), dueDate: toInputDate(project.dueDate) },
    }));
  };

  const handleSaveDates = async (id: string) => {
    const edit = dateEdits[id];
    if (!edit) return;
    setSavingDates(id);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: edit.startDate || null, dueDate: edit.dueDate || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, startDate: updated.startDate, dueDate: updated.dueDate } : p));
      setExpandedDates(null);
    }
    setSavingDates(null);
  };

  const openVisDialog = async (project: Project) => {
    const res = await fetch(`/api/admin/company-members/${project.userId}`);
    const members = res.ok ? await res.json() : [];
    setVisDialog({ project, visibility: project.visibility || "company", memberIds: project.memberIds || [], members: Array.isArray(members) ? members : [], saving: false });
  };

  const saveVisibility = async () => {
    if (!visDialog) return;
    setVisDialog((prev) => prev ? { ...prev, saving: true } : null);
    const res = await fetch(`/api/projects/${visDialog.project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: visDialog.visibility, memberIds: visDialog.memberIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => p.id === updated.id ? { ...p, visibility: updated.visibility, memberIds: updated.memberIds } : p));
      setVisDialog(null);
    } else {
      setVisDialog((prev) => prev ? { ...prev, saving: false } : null);
    }
  };

  const clients = Array.from(new Map(projects.map((p) => [p.user.name, p.user])).values());
  const filtered = filterClient === "all" ? projects : projects.filter((p) => p.user.name === filterClient);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all client projects</p>
        </div>
        <Link href="/admin/projects/new">
          <Button className="gap-2"><Plus className="h-4 w-4" />New Project</Button>
        </Link>
      </div>

      {templates.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-muted/30 p-3">
          <button onClick={() => setShowTemplates((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-foreground">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            Templates ({templates.length})
            {showTemplates ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showTemplates && (
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm">
                  {t.name}
                  <button onClick={() => handleDeleteTemplate(t.id)} className="text-muted-foreground hover:text-destructive" title="Delete template">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Link href="/admin/projects/new" className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50">
                <Plus className="h-3 w-3" /> Use a template
              </Link>
            </div>
          )}
        </div>
      )}

      {clients.length > 1 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button onClick={() => setFilterClient("all")} className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", filterClient === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50")}>
            All ({projects.length})
          </button>
          {clients.map((c) => {
            const count = projects.filter((p) => p.user.name === c.name).length;
            return (
              <button key={c.name} onClick={() => setFilterClient(c.name)} className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", filterClient === c.name ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50")}>
                {c.companyName || c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <Link href="/admin/projects/new"><Button>Create First Project</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => {
            const sc = statusConfig(project.status || "active");
            const isDatesOpen = expandedDates === project.id;
            const dateEdit = dateEdits[project.id] ?? { startDate: "", dueDate: "" };
            const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== "completed";

            return (
              <Card key={project.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: project.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                        <Badge variant="outline" className="text-xs font-normal">{project.user.companyName || project.user.name}</Badge>
                        {/* Inline status select */}
                        <select
                          value={project.status || "active"}
                          onChange={(e) => handleStatusChange(project.id, e.target.value)}
                          className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer bg-transparent focus:outline-none", sc.className)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{project._count.messages} messages</span>
                        <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" />{project._count.cards} cards</span>
                        {project.ratingAvg != null && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium" title={`${project.ratingCount} rating${project.ratingCount !== 1 ? "s" : ""}`}>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{project.ratingAvg.toFixed(1)}
                          </span>
                        )}
                        {project.startDate && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Start: {formatDate(project.startDate)}</span>}
                        {project.dueDate && (
                          <span className={cn("flex items-center gap-1", isOverdue ? "text-red-600 font-medium" : "")}>
                            <CalendarDays className="h-3.5 w-3.5" />Due: {formatDate(project.dueDate)}
                            {isOverdue && " (overdue)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleSaveAsTemplate(project)} disabled={savingTemplate === project.id} title="Save as template">
                      <LayoutTemplate className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => openVisDialog(project)} title="Visibility settings">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(project.id)} disabled={deleting === project.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Dates panel toggle */}
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => toggleDatesPanel(project)}>
                    <CalendarDays className="h-3 w-3" />
                    {project.startDate || project.dueDate ? "Edit dates" : "Set dates"}
                    {isDatesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {isDatesOpen && (
                    <div className="mt-2 flex items-end gap-3 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Start date</p>
                        <input
                          type="date"
                          value={dateEdit.startDate}
                          onChange={(e) => setDateEdits((prev) => ({ ...prev, [project.id]: { ...dateEdit, startDate: e.target.value } }))}
                          className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Due date</p>
                        <input
                          type="date"
                          value={dateEdit.dueDate}
                          onChange={(e) => setDateEdits((prev) => ({ ...prev, [project.id]: { ...dateEdit, dueDate: e.target.value } }))}
                          className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveDates(project.id)} disabled={savingDates === project.id}>
                        {savingDates === project.id ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpandedDates(null)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Visibility Dialog */}
      {visDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Visibility Settings</h2>
              <button onClick={() => setVisDialog(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Project: <span className="font-medium text-foreground">{visDialog.project.name}</span></p>
            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="visibility" value="company" checked={visDialog.visibility === "company"} onChange={() => setVisDialog((prev) => prev ? { ...prev, visibility: "company" } : null)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Visible to all team members</p>
                  <p className="text-xs text-muted-foreground">Everyone in the company can see this project</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="visibility" value="private" checked={visDialog.visibility === "private"} onChange={() => setVisDialog((prev) => prev ? { ...prev, visibility: "private" } : null)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Private — specific members only</p>
                  <p className="text-xs text-muted-foreground">Only selected members can see this project</p>
                </div>
              </label>
            </div>
            {visDialog.visibility === "private" && visDialog.members.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Select members with access:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                  {visDialog.members.map((member) => (
                    <label key={member.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={visDialog.memberIds.includes(member.id)} onChange={(e) => {
                        setVisDialog((prev) => {
                          if (!prev) return null;
                          const ids = e.target.checked ? [...prev.memberIds, member.id] : prev.memberIds.filter((id) => id !== member.id);
                          return { ...prev, memberIds: ids };
                        });
                      }} />
                      <div>
                        <p className="text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setVisDialog(null)}>Cancel</Button>
              <Button onClick={saveVisibility} disabled={visDialog.saving}>{visDialog.saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
