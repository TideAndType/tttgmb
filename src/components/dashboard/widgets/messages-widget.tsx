"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export function MessagesWidget() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages?limit=4").then(r => r.json()).then(d => { setMessages(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> Messages</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> :
          messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p> : (
            <>
              <div className="space-y-2">
                {messages.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="text-sm">
                    <p className="font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.authorName}</p>
                  </div>
                ))}
              </div>
              <Link href="/projects" className="text-xs text-primary hover:underline block pt-2">View all messages →</Link>
            </>
          )}
      </CardContent>
    </Card>
  );
}
