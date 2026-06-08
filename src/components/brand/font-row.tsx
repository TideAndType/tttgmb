"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FontRowProps {
  id: string;
  name: string;
  usage: string;
  onDelete: (id: string) => void;
}

const usageColors: Record<string, "default" | "secondary" | "outline"> = {
  HEADING: "default",
  BODY: "secondary",
  ACCENT: "outline",
  OTHER: "outline",
};

export function FontRow({ id, name, usage, onDelete }: FontRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground">{name}</span>
        <Badge variant={usageColors[usage] || "outline"}>{usage}</Badge>
      </div>
      <button
        onClick={() => onDelete(id)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
