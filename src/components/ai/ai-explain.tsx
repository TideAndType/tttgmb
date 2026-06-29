"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

// Drop-in "Explain with AI" control. Pass the report type and the data object
// shown on the page; it asks Claude for a plain-English readout.
export function AiExplain({ reportType, data }: { reportType: string; data: any }) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, data }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't generate an explanation.");
      setExplanation(d.explanation || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5 text-primary" />}
        {loading ? "Analyzing…" : "Explain with AI"}
      </Button>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      {explanation && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI summary
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
