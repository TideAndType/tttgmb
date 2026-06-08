"use client";

import { Trash2 } from "lucide-react";

interface ColorSwatchProps {
  id: string;
  name: string;
  hex: string;
  onDelete: (id: string) => void;
}

export function ColorSwatch({ id, name, hex, onDelete }: ColorSwatchProps) {
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div
        className="w-16 h-16 rounded-lg border border-border shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground uppercase">{hex}</p>
      </div>
      <button
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
