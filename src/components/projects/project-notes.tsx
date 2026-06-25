"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface ProjectNotesProps {
  projectId: string;
  initialNotes: string;
  readOnly?: boolean;
}

export function ProjectNotes({ projectId, initialNotes, readOnly = false }: ProjectNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (value: string) => {
    setNotes(value);
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      setStatus("saved");
      timerRef.current = setTimeout(() => setStatus("idle"), 2000);
    }, 800);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Notes</p>
        {status === "saving" && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
        {status === "saved" && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" />Saved</span>}
      </div>
      {readOnly ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[4rem]">
          {notes || <span className="italic">No notes yet.</span>}
        </p>
      ) : (
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add project notes, links, context, or anything the team should know..."
          rows={6}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
