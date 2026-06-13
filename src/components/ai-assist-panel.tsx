"use client";

import { useState } from "react";
import { X, Loader2, RefreshCw, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";

type Action = "proposal_section" | "task_description" | "client_update" | "rewrite";
type Tone = "professional" | "friendly" | "concise";

interface AiAssistPanelProps {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  defaultAction?: Action;
  prefillContext?: string;
}

const ACTION_LABELS: Record<Action, string> = {
  proposal_section: "Proposal Section",
  task_description: "Task Description",
  client_update: "Client Update",
  rewrite: "Rewrite",
};

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  concise: "Concise",
};

const ACTIONS: Action[] = ["proposal_section", "task_description", "client_update", "rewrite"];
const TONES: Tone[] = ["professional", "friendly", "concise"];

export function AiAssistPanel({
  open,
  onClose,
  onInsert,
  defaultAction = "proposal_section",
  prefillContext = "",
}: AiAssistPanelProps) {
  const [action, setAction] = useState<Action>(defaultAction);
  const [tone, setTone] = useState<Tone>("professional");
  const [context, setContext] = useState(prefillContext);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context, tone }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate content");
        return;
      }
      const data = await res.json();
      setResult(data.result ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-background border-l shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm">AI Writing Assistant</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Action selector */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Action</p>
          <div className="flex flex-wrap gap-1">
            {ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  action === a
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Tone selector */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Tone</p>
          <div className="flex gap-1">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  tone === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {TONE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Context textarea */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Context</p>
          <textarea
            rows={4}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Describe what you want to write about..."
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={generate}
          disabled={loading || !context.trim()}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate"
          )}
        </Button>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Result area */}
        {(result || loading) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Result</p>
            <textarea
              rows={8}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">{result.length} characters</p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generate}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
              <Button
                size="sm"
                onClick={() => onInsert(result)}
                disabled={!result.trim()}
                className="flex-1"
              >
                <ArrowDownToLine className="h-3 w-3 mr-1" />
                Insert
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
