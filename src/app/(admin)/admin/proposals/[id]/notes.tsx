"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export function AdminProposalNotes({
  proposalId,
  initialNotes,
}: {
  proposalId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-2">
      <textarea
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px] resize-y"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Internal notes (not visible to client)..."
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="h-3 w-3 mr-2 text-green-500" />
        ) : null}
        {saved ? "Saved" : "Save Notes"}
      </Button>
    </div>
  );
}
