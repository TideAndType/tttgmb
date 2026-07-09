"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, Check, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Persistent slide-out right panel for notifications. Toggle with the edge
// handle, the header bell, or Shift+S. Open state persists across navigation.
export function NotificationsSidebar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(open);
  openRef.current = open;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Restore persisted open state.
  useEffect(() => {
    try { if (localStorage.getItem("notifSidebarOpen") === "1") setOpen(true); } catch { /* ignore */ }
  }, []);

  // Poll for notifications.
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try { localStorage.setItem("notifSidebarOpen", next ? "1" : "0"); } catch { /* ignore */ }
      if (next) fetchNotifications();
      return next;
    });
  }, [fetchNotifications]);

  // Keyboard: Shift+S toggles (ignored while typing). External trigger via event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey && (e.key === "S" || e.key === "s")) { e.preventDefault(); toggle(); }
    };
    const onEvt = () => toggle();
    window.addEventListener("keydown", onKey);
    window.addEventListener("toggle-notifications", onEvt);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("toggle-notifications", onEvt); };
  }, [toggle]);

  const markRead = async (n: Notification) => {
    if (n.readAt) return;
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
    setUnread((u) => Math.max(0, u - 1));
    try { await fetch(`/api/notifications/${n.id}`, { method: "PATCH" }); } catch { /* ignore */ }
  };

  const markAll = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnread(0);
    try { await fetch("/api/notifications", { method: "PATCH" }); } catch { /* ignore */ }
  };

  return (
    <>
      {/* Edge handle — always visible */}
      <button
        onClick={toggle}
        title="Notifications (Shift+S)"
        aria-label="Toggle notifications"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-r-0 border-border rounded-l-lg px-1.5 py-3 shadow hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {/* Slide-out panel (overlay; opening a notification doesn't navigate away) */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Notifications</span>
            {unread > 0 && <span className="text-xs text-muted-foreground">({unread} new)</span>}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && <button onClick={markAll} className="text-xs text-primary hover:underline flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Mark all read</button>}
            <button onClick={toggle} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">You&apos;re all caught up 🎉</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                className={cn("px-4 py-3 border-b border-border cursor-pointer hover:bg-accent transition-colors", !n.readAt && "bg-primary/5")}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    {n.link && (
                      <Link href={n.link} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline mt-1">
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
