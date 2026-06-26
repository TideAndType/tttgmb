"use client";

import { useState } from "react";
import { Star, CheckCircle } from "lucide-react";

interface SatisfactionRatingProps {
  projectId: string;
  initialScore: number | null;
  initialComment: string | null;
}

export function SatisfactionRating({ projectId, initialScore, initialComment }: SatisfactionRatingProps) {
  const [score, setScore] = useState(initialScore ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [submitted, setSubmitted] = useState(initialScore != null);
  const [editing, setEditing] = useState(initialScore == null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (score < 1) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment }),
    });
    setSaving(false);
    if (res.ok) { setSubmitted(true); setEditing(false); }
  };

  if (submitted && !editing) {
    return (
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-6 w-6 ${n <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <p className="flex items-center justify-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" /> Thanks for your feedback!
        </p>
        {comment && <p className="text-sm text-muted-foreground mt-1 italic">&ldquo;{comment}&rdquo;</p>}
        <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline mt-2">Edit rating</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">How satisfied are you with this project?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={`h-7 w-7 transition-colors ${n <= (hover || score) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more (optional)..."
        rows={2}
        className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
      />
      <button
        onClick={submit}
        disabled={score < 1 || saving}
        className="text-sm font-medium bg-primary text-primary-foreground rounded-md px-4 py-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saving ? "Submitting..." : "Submit rating"}
      </button>
    </div>
  );
}
