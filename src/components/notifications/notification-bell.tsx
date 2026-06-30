"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";

// The header bell now just toggles the persistent NotificationsSidebar via a
// window event. It keeps polling the unread count so the badge stays accurate.
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <button
      onClick={() => window.dispatchEvent(new Event("toggle-notifications"))}
      className="relative p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label="Notifications (Shift+S)"
      title="Notifications (Shift+S)"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
