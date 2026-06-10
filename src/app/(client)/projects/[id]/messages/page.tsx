"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Clock } from "lucide-react";

interface Message {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
  _count: { comments: number };
}

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            <Link href={`/projects/${id}`} className="hover:underline">Project</Link>
            {" / "}
            <span>Messages</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Message Board</h1>
        </div>
        <Link href={`/projects/${id}/messages/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Start a conversation by posting the first message.
          </p>
          <Link href={`/projects/${id}/messages/new`}>
            <Button>Post a Message</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Link key={msg.id} href={`/projects/${id}/messages/${msg.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <h3 className="font-semibold text-foreground">{msg.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                    <span>{msg.authorName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {msg._count.comments} comment{msg._count.comments !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
