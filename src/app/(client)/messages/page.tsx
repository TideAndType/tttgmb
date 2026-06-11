"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DM {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  createdAt: string;
}

interface AdminInfo {
  id: string;
  name: string;
}

export default function ClientMessagesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/id")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setAdmin(data);
      });
  }, []);

  useEffect(() => {
    if (!admin) return;
    const load = () => {
      fetch(`/api/dm?with=${admin.id}`)
        .then((r) => r.json())
        .then((data) => setMessages(Array.isArray(data) ? data : []));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [admin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || !admin) return;
    setSending(true);
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: admin.id, body: body.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setBody("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Your Account Team</p>
      </div>

      {!admin ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.fromId === user?.id;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[70%]")}>
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

          <div className="border-t border-border pt-4 flex gap-3">
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
  );
}
