"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DM {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  createdAt: string;
}

interface Thread {
  counterpartId: string;
  counterpartName: string;
  counterpartCompany: string | null;
  lastMessage: DM;
  unreadCount: number;
}

export default function AdminMessagesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = () => {
    fetch("/api/dm/threads")
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const load = () => {
      fetch(`/api/dm?with=${selectedId}`)
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data : []));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || !selectedId) return;
    setSending(true);
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: selectedId, body: body.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setBody("");
      loadThreads();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const selectedThread = threads.find((t) => t.counterpartId === selectedId);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Private client conversations</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)] border border-border rounded-lg overflow-hidden">
        {/* Thread list */}
        <div className="w-1/3 border-r border-border overflow-y-auto">
          {threads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          )}
          {threads.map((thread) => (
            <button
              key={thread.counterpartId}
              onClick={() => setSelectedId(thread.counterpartId)}
              className={cn(
                "w-full text-left p-4 border-b border-border transition-colors",
                selectedId === thread.counterpartId
                  ? "bg-primary/10"
                  : "hover:bg-accent"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">{thread.counterpartName}</p>
                  {thread.counterpartCompany && (
                    <p className="text-xs text-muted-foreground truncate">{thread.counterpartCompany}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">{thread.lastMessage?.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {thread.unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 text-xs px-1.5">{thread.unreadCount}</Badge>
                  )}
                  {thread.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(thread.lastMessage.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-border p-4">
                <p className="font-medium">{selectedThread?.counterpartName}</p>
                {selectedThread?.counterpartCompany && (
                  <p className="text-sm text-muted-foreground">{selectedThread.counterpartCompany}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {messages.map((msg) => {
                  const isMe = msg.fromId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className="max-w-[70%]">
                        <div
                          className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          )}
                        >
                          {msg.body}
                        </div>
                        <p className={cn("text-xs text-muted-foreground mt-1", isMe ? "text-right" : "text-left")}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-border p-4 flex gap-3">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Ctrl+Enter to send)"
                  className="resize-none"
                  rows={3}
                />
                <Button onClick={handleSend} disabled={sending || !body.trim()} className="self-end gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
