"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, X } from "lucide-react";

interface Item { id: string; title: string; body: string; createdAt: string }

// Renders announcement banners that the user can dismiss. Dismissed ids are
// remembered in localStorage so they stay hidden for that person.
export function AnnouncementBanners({ items, accent = "primary" }: { items: Item[]; accent?: "primary" | "violet" }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dismissedAnnouncements");
      if (saved) setDismissed(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const close = (id: string) => {
    setDismissed((prev) => {
      const next = Array.from(new Set([...prev, id]));
      try { localStorage.setItem("dismissedAnnouncements", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const border = accent === "violet" ? "border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10" : "border-primary/30 bg-primary/5";
  const icon = accent === "violet" ? "text-violet-600" : "text-primary";

  return (
    <div className="space-y-3 mb-8">
      {visible.map((a) => (
        <Card key={a.id} className={border}>
          <CardContent className="py-4 flex items-start gap-3">
            <Megaphone className={`h-5 w-5 shrink-0 mt-0.5 ${icon}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{a.title}</p>
                <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{a.body}</p>
            </div>
            <button onClick={() => close(a.id)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
