"use client";

import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, ArrowLeft, RotateCcw, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type WidgetItem = { id: string; enabled: boolean };

const ALL_WIDGETS: { id: string; label: string; description: string }[] = [
  { id: "welcome", label: "Welcome", description: "Your name and company greeting" },
  { id: "projects", label: "Projects", description: "Active project list" },
  { id: "tasks", label: "Tasks", description: "Open and completed tasks" },
  { id: "messages", label: "Messages", description: "Recent project messages" },
  { id: "invoices", label: "Invoices", description: "Paid and outstanding invoices" },
  { id: "approvals", label: "Approvals", description: "Pending approval requests" },
  { id: "meetings", label: "Meetings", description: "Upcoming scheduled meetings" },
  { id: "files", label: "Files", description: "Recently shared files" },
  { id: "activity", label: "Activity", description: "Recent portal activity feed" },
  { id: "ai-visibility", label: "AI Visibility", description: "OpenLens visibility scores" },
];

const DEFAULT_LAYOUT: WidgetItem[] = ALL_WIDGETS.map(w => ({ id: w.id, enabled: true }));

function SortableRow({ item, onRemove }: { item: WidgetItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const meta = ALL_WIDGETS.find(w => w.id === item.id);
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5">
      <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{meta?.label ?? item.id}</p>
        <p className="text-xs text-gray-400">{meta?.description}</p>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function DashboardBuilderPage() {
  const [layout, setLayout] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetch("/api/dashboard/layout").then(r => r.json()).then(d => { setLayout(Array.isArray(d) ? d : DEFAULT_LAYOUT); setLoading(false); }).catch(() => { setLayout(DEFAULT_LAYOUT); setLoading(false); });
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout(prev => {
        const oldIdx = prev.findIndex(w => w.id === active.id);
        const newIdx = prev.findIndex(w => w.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function remove(id: string) {
    setLayout(prev => prev.filter(w => w.id !== id));
  }

  function add(id: string) {
    if (layout.find(w => w.id === id)) {
      setLayout(prev => prev.map(w => w.id === id ? { ...w, enabled: true } : w));
    } else {
      setLayout(prev => [...prev, { id, enabled: true }]);
    }
  }

  async function save() {
    setSaving(true);
    await fetch("/api/dashboard/layout", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(layout) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const enabledIds = new Set(layout.map(w => w.id));
  const available = ALL_WIDGETS.filter(w => !enabledIds.has(w.id));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Customize Dashboard</h1>
            <p className="text-sm text-muted-foreground">Drag to reorder · click × to remove</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLayout(DEFAULT_LAYOUT)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {saved ? "Saved!" : "Save Layout"}
          </Button>
        </div>
      </div>

      {/* Active widgets */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Widgets</h2>
        {layout.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No widgets enabled. Add some from below.</CardContent></Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layout.map(w => w.id)} strategy={rectSortingStrategy}>
              <div className="space-y-2">
                {layout.map(w => <SortableRow key={w.id} item={w} onRemove={() => remove(w.id)} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Available widgets palette */}
      {available.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Widgets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {available.map(w => (
              <button key={w.id} onClick={() => add(w.id)} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary rounded-lg px-3 py-2.5 text-left transition-colors group">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{w.label}</p>
                  <p className="text-xs text-muted-foreground">{w.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
