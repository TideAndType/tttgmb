"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, List, X,
  Instagram, Linkedin, Mail, Video, FileText, Megaphone, Mic,
  ExternalLink, Edit2, Trash2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

type ContentStatus = "IDEA" | "IN_PROGRESS" | "REVIEW" | "SCHEDULED" | "PUBLISHED";
type ContentType =
  | "BLOG_POST" | "SOCIAL_INSTAGRAM" | "SOCIAL_FACEBOOK" | "SOCIAL_LINKEDIN"
  | "SOCIAL_TWITTER" | "EMAIL" | "VIDEO" | "PODCAST" | "AD" | "OTHER";

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  scheduledAt: string | null;
  notes: string | null;
  url: string | null;
  tags: string[];
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ContentStatus, string> = {
  IDEA:        "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  REVIEW:      "bg-amber-100 text-amber-800 border-amber-200",
  SCHEDULED:   "bg-purple-100 text-purple-700 border-purple-200",
  PUBLISHED:   "bg-green-100 text-green-700 border-green-200",
};

const STATUS_DOT: Record<ContentStatus, string> = {
  IDEA: "bg-gray-400", IN_PROGRESS: "bg-blue-500", REVIEW: "bg-amber-500",
  SCHEDULED: "bg-purple-500", PUBLISHED: "bg-green-500",
};

const TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: "Blog Post", SOCIAL_INSTAGRAM: "Instagram", SOCIAL_FACEBOOK: "Facebook",
  SOCIAL_LINKEDIN: "LinkedIn", SOCIAL_TWITTER: "Twitter/X", EMAIL: "Email",
  VIDEO: "Video", PODCAST: "Podcast", AD: "Ad", OTHER: "Other",
};

const TYPE_COLORS: Record<ContentType, string> = {
  BLOG_POST: "bg-orange-100 text-orange-700",
  SOCIAL_INSTAGRAM: "bg-pink-100 text-pink-700",
  SOCIAL_FACEBOOK: "bg-blue-100 text-blue-700",
  SOCIAL_LINKEDIN: "bg-sky-100 text-sky-700",
  SOCIAL_TWITTER: "bg-slate-100 text-slate-700",
  EMAIL: "bg-violet-100 text-violet-700",
  VIDEO: "bg-red-100 text-red-700",
  PODCAST: "bg-green-100 text-green-700",
  AD: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function TypeIcon({ type, className = "h-3.5 w-3.5" }: { type: ContentType; className?: string }) {
  switch (type) {
    case "BLOG_POST": return <FileText className={className} />;
    case "SOCIAL_INSTAGRAM": return <Instagram className={className} />;
    case "SOCIAL_LINKEDIN": return <Linkedin className={className} />;
    case "EMAIL": return <Mail className={className} />;
    case "VIDEO": return <Video className={className} />;
    case "PODCAST": return <Mic className={className} />;
    case "AD": return <Megaphone className={className} />;
    default: return <FileText className={className} />;
  }
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(date?: string) {
  return { title: "", type: "BLOG_POST" as ContentType, status: "IDEA" as ContentStatus, scheduledAt: date || "", notes: "", url: "", tags: "" };
}

// ─── Content item card ────────────────────────────────────────────────────────

function ItemChip({ item, onEdit, onDelete }: { item: ContentItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`group flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer truncate ${TYPE_COLORS[item.type]}`}
      onClick={onEdit}>
      <TypeIcon type={item.type} />
      <span className="truncate flex-1">{item.title}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 hover:text-red-600 ml-auto shrink-0">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentCalendarPage() {
  const today = new Date();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [prefillDate, setPrefillDate] = useState("");
  const [filterType, setFilterType] = useState<"" | ContentType>("");
  const [filterStatus, setFilterStatus] = useState<"" | ContentStatus>("");
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month: monthStr });
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/content?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [monthStr, filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  function openNew(date = "") { setEditItem(null); setPrefillDate(date); setForm(emptyForm(date)); setModalOpen(true); }
  function openEdit(item: ContentItem) {
    setEditItem(item);
    setForm({
      title: item.title, type: item.type, status: item.status,
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : "",
      notes: item.notes || "", url: item.url || "", tags: item.tags.join(", "),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      title: form.title, type: form.type, status: form.status,
      scheduledAt: form.scheduledAt || null,
      notes: form.notes || null, url: form.url || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    if (editItem) {
      await fetch(`/api/content/${editItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false); setModalOpen(false); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this content item?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    load();
  }

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  function dateKey(d: number) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
  function itemsForDay(d: number) {
    const key = dateKey(d);
    return items.filter(it => it.scheduledAt && it.scheduledAt.startsWith(key));
  }

  const ideasAndUnscheduled = items.filter(it => !it.scheduledAt);

  // Stats
  const totalItems = items.length;
  const published = items.filter(i => i.status === "PUBLISHED").length;
  const scheduled = items.filter(i => i.status === "SCHEDULED").length;
  const ideas = items.filter(i => i.status === "IDEA").length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-sm text-muted-foreground">Plan and track your content pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}><CalendarDays className="h-3.5 w-3.5" /> Calendar</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}><List className="h-3.5 w-3.5" /> List</button>
          </div>
          <Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1.5" /> New Content</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 border-b border-border shrink-0">
        {[
          { label: "This Month", value: totalItems, color: "text-foreground" },
          { label: "Published", value: published, color: "text-green-600" },
          { label: "Scheduled", value: scheduled, color: "text-purple-600" },
          { label: "Ideas", value: ideas, color: "text-gray-500" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + nav */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border bg-muted/30 shrink-0 flex-wrap">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-foreground min-w-[130px] text-center">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <select value={filterType} onChange={e => setFilterType(e.target.value as "" | ContentType)} className="text-xs border border-border rounded px-2 py-1 bg-background">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as "" | ContentStatus)} className="text-xs border border-border rounded px-2 py-1 bg-background">
          <option value="">All Statuses</option>
          {(["IDEA","IN_PROGRESS","REVIEW","SCHEDULED","PUBLISHED"] as ContentStatus[]).map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {view === "calendar" ? (
          <div className="p-4 min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDay + 1;
                const isThisMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const isToday = isThisMonth && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const dayItems = isThisMonth ? itemsForDay(dayNum) : [];
                return (
                  <div key={i} className={`bg-card min-h-[100px] p-1.5 relative ${isThisMonth ? "cursor-pointer hover:bg-muted/40" : "bg-muted/20 opacity-40"} ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    onClick={() => isThisMonth && openNew(dateKey(dayNum) + "T09:00")}>
                    <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {isThisMonth ? dayNum : ""}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.map(item => (
                        <ItemChip key={item.id} item={item}
                          onEdit={() => { openEdit(item); }}
                          onDelete={() => handleDelete(item.id)} />
                      ))}
                    </div>
                    {dayItems.length === 0 && isThisMonth && (
                      <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Unscheduled */}
            {ideasAndUnscheduled.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Unscheduled Ideas ({ideasAndUnscheduled.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {ideasAndUnscheduled.map(item => (
                    <div key={item.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${TYPE_COLORS[item.type]}`}
                      onClick={() => openEdit(item)}>
                      <TypeIcon type={item.type} />
                      {item.title}
                      <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List view */
          <div className="p-6">
            {loading ? (
              <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No content items this month. Click &quot;New Content&quot; to add one.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <TypeIcon type={item.type} className="h-4 w-4 text-muted-foreground shrink-0" />
                            {item.title}
                            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" onClick={e => e.stopPropagation()}><ExternalLink className="h-3 w-3" /></a>}
                          </div>
                          {item.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">{item.tags.map(t => <span key={t} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">#{t}</span>)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}><TypeIcon type={item.type} />{TYPE_LABELS[item.type]}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                            {item.status !== "PUBLISHED" && (
                              <button onClick={async () => { await fetch(`/api/content/${item.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: "PUBLISHED" }) }); load(); }} className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600" title="Mark published"><Check className="h-3.5 w-3.5" /></button>
                            )}
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">{editItem ? "Edit Content" : "New Content Item"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-primary/30" placeholder="Content title..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ContentType }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContentStatus }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background">
                    {(["IDEA","IN_PROGRESS","REVIEW","SCHEDULED","PUBLISHED"] as ContentStatus[]).map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">URL (optional)</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background outline-none resize-none" placeholder="Notes, brief, key messages..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background outline-none" placeholder="seo, brand, campaign..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.title || saving}>{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
