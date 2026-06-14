"use client";

import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings } from "lucide-react";
import Link from "next/link";
import { WelcomeWidget } from "./widgets/welcome-widget";
import { ProjectsWidget } from "./widgets/projects-widget";
import { TasksWidget } from "./widgets/tasks-widget";
import { MessagesWidget } from "./widgets/messages-widget";
import { InvoicesWidget } from "./widgets/invoices-widget";
import { ApprovalsWidget } from "./widgets/approvals-widget";
import { MeetingsWidget } from "./widgets/meetings-widget";
import { FilesWidget } from "./widgets/files-widget";
import { ActivityWidget } from "./widgets/activity-widget";
import { AiVisibilityWidget } from "@/components/dashboard-ai-visibility";

export type WidgetItem = { id: string; enabled: boolean };

const WIDGET_MAP: Record<string, React.FC> = {
  welcome: WelcomeWidget,
  projects: ProjectsWidget,
  tasks: TasksWidget,
  messages: MessagesWidget,
  invoices: InvoicesWidget,
  approvals: ApprovalsWidget,
  meetings: MeetingsWidget,
  files: FilesWidget,
  activity: ActivityWidget,
  "ai-visibility": AiVisibilityWidget,
};

function SortableWidget({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Widget = WIDGET_MAP[id];
  if (!Widget) return null;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Widget />
    </div>
  );
}

export function DashboardCanvas() {
  const [layout, setLayout] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetch("/api/dashboard/layout").then(r => r.json()).then(d => { setLayout(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout(prev => {
        const oldIdx = prev.findIndex(w => w.id === active.id);
        const newIdx = prev.findIndex(w => w.id === over.id);
        const next = arrayMove(prev, oldIdx, newIdx);
        fetch("/api/dashboard/layout", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
        return next;
      });
    }
  }

  const enabled = layout.filter(w => w.enabled);

  if (loading) return null;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link href="/dashboard/builder" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
          <Settings className="w-3.5 h-3.5" /> Customize
        </Link>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={enabled.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enabled.map(w => <SortableWidget key={w.id} id={w.id} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
