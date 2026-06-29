"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { MessageCircle, Loader2 } from "lucide-react";

interface Answer { id: string; userId: string; authorName: string; body: string; date: string; }
interface CheckIn { id: string; prompt: string; answers: Answer[]; }

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export function CheckInsWidget() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [me, setMe] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const res = await fetch("/api/checkins");
    if (res.ok) {
      const data = await res.json();
      setCheckIns(data.checkIns || []);
      setMe(data.me || "");
    }
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const submit = async (id: string) => {
    const body = (drafts[id] || "").trim();
    if (!body) return;
    setSaving(id);
    const res = await fetch(`/api/checkins/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSaving(null);
    if (res.ok) { setDrafts((d) => ({ ...d, [id]: "" })); load(); }
  };

  if (!loaded || checkIns.length === 0) return null;

  const tk = todayKey();

  return (
    <div className="space-y-3">
      {checkIns.map((ci) => {
        const todays = ci.answers.filter((a) => a.date.split("T")[0] === tk);
        const mineToday = todays.find((a) => a.userId === me);
        return (
          <Card key={ci.id} className="border-primary/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">{ci.prompt}</p>
              </div>

              {mineToday ? (
                <p className="text-xs text-muted-foreground mb-3">You answered today ✓ — you can update it below.</p>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <textarea
                  value={drafts[ci.id] ?? mineToday?.body ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [ci.id]: e.target.value }))}
                  rows={2}
                  placeholder="Your answer for today…"
                  className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
                />
                <Button size="sm" onClick={() => submit(ci.id)} disabled={saving === ci.id}>
                  {saving === ci.id ? <Loader2 className="h-4 w-4 animate-spin" /> : mineToday ? "Update" : "Reply"}
                </Button>
              </div>

              {todays.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  {todays.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <UserAvatar name={a.authorName} seed={a.userId} className="h-6 w-6 text-[10px]" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{a.authorName}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
