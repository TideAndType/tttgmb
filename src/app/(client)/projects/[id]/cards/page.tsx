"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronLeft, ChevronRight, Calendar, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Card {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  label?: string | null;
  position: number;
  columnId: string;
}

interface Column {
  id: string;
  name: string;
  position: number;
  cards: Card[];
}

const PRIORITIES = [
  { value: "HIGH",   label: "High",   className: "bg-red-100 text-red-700" },
  { value: "MEDIUM", label: "Medium", className: "bg-yellow-100 text-yellow-700" },
  { value: "LOW",    label: "Low",    className: "bg-blue-100 text-blue-700" },
];

const LABELS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
];

function priorityConfig(p: string | null | undefined) {
  return PRIORITIES.find((x) => x.value === p);
}

export default function KanbanPage() {
  const { id } = useParams<{ id: string }>();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Edit card popover
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", dueDate: "", priority: "", label: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [filterDue, setFilterDue] = useState(""); // "overdue" | "week" | "none" | ""
  const [showFilters, setShowFilters] = useState(false);

  const fetchColumns = () => {
    fetch(`/api/projects/${id}/columns`)
      .then((r) => r.json())
      .then((data) => setColumns(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchColumns(); }, [id]);

  // Close edit popover on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditingCard(null);
    }
    if (editingCard) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingCard]);

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    await fetch(`/api/projects/${id}/columns/${columnId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newCardTitle }),
    });
    setNewCardTitle(""); setAddingCard(null);
    fetchColumns();
  };

  const deleteCard = async (columnId: string, cardId: string) => {
    await fetch(`/api/projects/${id}/columns/${columnId}/cards/${cardId}`, { method: "DELETE" });
    fetchColumns();
  };

  const moveCard = async (card: Card, direction: "left" | "right") => {
    const sortedCols = [...columns].sort((a, b) => a.position - b.position);
    const currentIdx = sortedCols.findIndex((c) => c.id === card.columnId);
    const targetIdx = direction === "left" ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= sortedCols.length) return;
    const targetCol = sortedCols[targetIdx];
    await fetch(`/api/projects/${id}/columns/${card.columnId}/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: targetCol.id, position: targetCol.cards.length }),
    });
    fetchColumns();
  };

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setEditForm({
      title: card.title,
      description: card.description ?? "",
      dueDate: card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : "",
      priority: card.priority ?? "",
      label: card.label ?? "",
    });
  };

  const saveEditCard = async () => {
    if (!editingCard) return;
    setSavingEdit(true);
    await fetch(`/api/projects/${id}/columns/${editingCard.columnId}/cards/${editingCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description || null,
        dueDate: editForm.dueDate || null,
        priority: editForm.priority || null,
        label: editForm.label || null,
      }),
    });
    setSavingEdit(false);
    setEditingCard(null);
    fetchColumns();
  };

  const addColumn = async () => {
    if (!newColumnName.trim()) return;
    await fetch(`/api/projects/${id}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newColumnName }),
    });
    setNewColumnName(""); setAddingColumn(false);
    fetchColumns();
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column and all its cards?")) return;
    await fetch(`/api/projects/${id}/columns/${columnId}`, { method: "DELETE" });
    fetchColumns();
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const isDueThisWeek = (dueDate: string) => {
    const d = new Date(dueDate);
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= week;
  };

  const filterCard = (card: Card) => {
    if (search && !card.title.toLowerCase().includes(search.toLowerCase()) && !(card.description?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterPriority && card.priority !== filterPriority) return false;
    if (filterLabel && card.label !== filterLabel) return false;
    if (filterDue === "overdue" && (!card.dueDate || !isOverdue(card.dueDate))) return false;
    if (filterDue === "week" && (!card.dueDate || !isDueThisWeek(card.dueDate))) return false;
    if (filterDue === "none" && card.dueDate) return false;
    return true;
  };

  const activeFilterCount = [search, filterPriority, filterLabel, filterDue].filter(Boolean).length;
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-full">
      <div className="mb-4 px-1">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${id}`} className="hover:underline">Project</Link> / <span>Card Board</span>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-foreground">Card Board</h1>
          {/* Filter bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards..."
                className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors",
                showFilters || activeFilterCount > 0
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setSearch(""); setFilterPriority(""); setFilterLabel(""); setFilterDue(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg border border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Priority</p>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p.value} onClick={() => setFilterPriority(filterPriority === p.value ? "" : p.value)}
                    className={cn("text-xs px-2 py-0.5 rounded-full border transition-colors", filterPriority === p.value ? p.className + " border-transparent" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Label</p>
              <div className="flex gap-1.5">
                {LABELS.map((l) => (
                  <button key={l.value} onClick={() => setFilterLabel(filterLabel === l.value ? "" : l.value)} title={l.label}
                    className={cn("w-5 h-5 rounded-full border-2 transition-all", filterLabel === l.value ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: l.value }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Due Date</p>
              <div className="flex gap-1.5">
                {[["overdue", "Overdue"], ["week", "This week"], ["none", "No date"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFilterDue(filterDue === val ? "" : val)}
                    className={cn("text-xs px-2 py-0.5 rounded-full border transition-colors", filterDue === val ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground px-1">Loading board...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
          {sortedColumns.map((column) => {
            const visibleCards = column.cards.filter(filterCard).sort((a, b) => a.position - b.position);
            const hiddenCount = column.cards.length - visibleCards.length;
            return (
              <div key={column.id} className="flex-shrink-0 w-72 bg-muted/30 rounded-lg border border-border">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{column.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {visibleCards.length}{hiddenCount > 0 && `/${column.cards.length}`}
                    </span>
                  </div>
                  <button onClick={() => deleteColumn(column.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-12">
                  {hiddenCount > 0 && (
                    <p className="text-xs text-center text-muted-foreground py-1">{hiddenCount} card{hiddenCount > 1 ? "s" : ""} filtered out</p>
                  )}
                  {visibleCards.map((card) => {
                    const pc = priorityConfig(card.priority);
                    const overdue = card.dueDate && isOverdue(card.dueDate);
                    return (
                      <div key={card.id} className="group bg-card rounded-md border border-border shadow-sm overflow-hidden">
                        {/* Label stripe */}
                        {card.label && <div className="h-1" style={{ backgroundColor: card.label }} />}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-1">
                            <button onClick={() => openEditCard(card)} className="text-sm font-medium text-foreground leading-snug flex-1 text-left hover:text-primary transition-colors">
                              {card.title}
                            </button>
                            <button onClick={() => deleteCard(column.id, card.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {card.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {pc && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", pc.className)}>{pc.label}</span>
                            )}
                            {card.dueDate && (
                              <span className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                                <Calendar className="h-3 w-3" />
                                {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          {/* Move buttons */}
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveCard(card, "left")} className="text-xs text-muted-foreground hover:text-foreground p-0.5" title="Move left">
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => moveCard(card, "right")} className="text-xs text-muted-foreground hover:text-foreground p-0.5" title="Move right">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add card */}
                <div className="p-2 pt-0">
                  {addingCard === column.id ? (
                    <div className="space-y-2">
                      <Input autoFocus value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="Card title..."
                        onKeyDown={(e) => { if (e.key === "Enter") addCard(column.id); if (e.key === "Escape") { setAddingCard(null); setNewCardTitle(""); } }}
                        className="text-sm h-8" />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => addCard(column.id)} disabled={!newCardTitle.trim()}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingCard(null); setNewCardTitle(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingCard(column.id); setNewCardTitle(""); }}
                      className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors">
                      <Plus className="h-3.5 w-3.5" />Add card
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add column */}
          <div className="flex-shrink-0 w-72">
            {addingColumn ? (
              <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                <Input autoFocus value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Column name..."
                  onKeyDown={(e) => { if (e.key === "Enter") addColumn(); if (e.key === "Escape") { setAddingColumn(false); setNewColumnName(""); } }}
                  className="text-sm h-8" />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs" onClick={addColumn} disabled={!newColumnName.trim()}>Add Column</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingColumn(false); setNewColumnName(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg border border-dashed border-border transition-colors">
                <Plus className="h-4 w-4" />Add column
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card edit popover */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={editRef} className="bg-background border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Edit Card</h3>
              <button onClick={() => setEditingCard(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Title</label>
              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Priority</label>
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none">
                  <option value="">None</option>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Due Date</label>
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Label Color</label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setEditForm({ ...editForm, label: "" })}
                  className={cn("w-5 h-5 rounded-full border-2 bg-muted", !editForm.label ? "border-foreground" : "border-transparent")} title="None" />
                {LABELS.map((l) => (
                  <button key={l.value} onClick={() => setEditForm({ ...editForm, label: editForm.label === l.value ? "" : l.value })} title={l.label}
                    className={cn("w-5 h-5 rounded-full border-2 transition-all", editForm.label === l.value ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: l.value }} />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveEditCard} disabled={savingEdit || !editForm.title.trim()} className="flex-1">
                {savingEdit ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingCard(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
