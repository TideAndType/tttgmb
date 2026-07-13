"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Sparkles, Send, Plus, Trash2, Loader2 } from "lucide-react";

interface Msg { id?: string; role: "user" | "assistant"; content: string; }
interface Convo { id: string; title: string; updatedAt: string; }

const SUGGESTIONS = [
  "What should I post today?",
  "Why might my rankings have dropped?",
  "Write a promotional email campaign.",
  "What are my competitors doing better?",
];

export default function AssistantPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvos = async () => {
    const d = await fetch("/api/marketing/assistant").then((r) => r.json());
    setConvos(d.conversations ?? []);
  };
  useEffect(() => { loadConvos(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const openConvo = async (id: string) => {
    setActiveId(id);
    const d = await fetch(`/api/marketing/assistant?id=${id}`).then((r) => r.json());
    setMessages(d.conversation?.messages ?? []);
  };

  const newConvo = () => { setActiveId(null); setMessages([]); setInput(""); };

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    try {
      const r = await fetch("/api/marketing/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Something went wrong."); setSending(false); return; }
      setMessages((prev) => [...prev, { role: "assistant", content: d.reply }]);
      if (!activeId) { setActiveId(d.conversationId); loadConvos(); }
    } catch { setError("Network error."); }
    setSending(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/marketing/assistant?id=${id}`, { method: "DELETE" });
    if (activeId === id) newConvo();
    loadConvos();
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100dvh-15rem)] lg:h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversations */}
      <div className="hidden md:flex w-60 flex-col border border-border rounded-lg bg-card">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full" onClick={newConvo}><Plus className="h-4 w-4 mr-1.5" /> New chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convos.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer ${activeId === c.id ? "bg-accent" : "hover:bg-accent/50"}`} onClick={() => openConvo(c.id)}>
              <span className="text-sm text-foreground truncate flex-1">{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {convos.length === 0 && <p className="text-xs text-muted-foreground px-2 py-4 text-center">No conversations yet.</p>}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col border border-border rounded-lg bg-card min-w-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">AI Marketing Assistant</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="p-3 rounded-full bg-primary/10"><Sparkles className="h-7 w-7 text-primary" /></div>
              <p className="text-muted-foreground max-w-sm">Ask me anything about growing your business — content, SEO, campaigns, competitors. I know your business profile.</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent text-foreground">{s}</button>)}
              </div>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "assistant" ? <RichTextContent text={m.content} /> : <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="bg-muted rounded-2xl px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>}
          <div ref={bottomRef} />
        </div>
        {error && <p className="px-4 text-sm text-destructive">{error}</p>}
        <div className="p-3 border-t border-border flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask your AI marketing assistant…"
            rows={1}
            className="flex-1 resize-none border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
          />
          <Button onClick={() => send()} disabled={sending || !input.trim()} className="shrink-0"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
