"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Send } from "lucide-react";

interface ChatMsg { id: string; userId: string; authorName: string; body: string; createdAt: string; }

// Lightweight per-project chat (Campfire-style). Polls every 8s for new messages.
export function ProjectChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [me, setMe] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/chat`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      setMe(data.me || "");
    }
  }, [projectId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (res.ok) { setDraft(""); load(); }
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.userId === me;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <UserAvatar name={m.authorName} seed={m.userId} className="h-7 w-7 text-[10px] mt-0.5" />
                <div className={`max-w-[75%] ${mine ? "items-end text-right" : ""} flex flex-col`}>
                  <span className="text-xs text-muted-foreground">{m.authorName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  <div className={`rounded-2xl px-3 py-1.5 text-sm mt-0.5 inline-block ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="flex-1 border border-input rounded-full px-4 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" onClick={send} disabled={sending || !draft.trim()} className="rounded-full h-9 w-9 p-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
