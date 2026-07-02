"use client";

import Link from "next/link";
import { Plus, MessageSquare, Clock, Paperclip, CalendarDays } from "lucide-react";

const actions = [
  { label: "New Task", icon: Plus, href: "/tasks?new=1" },
  { label: "New Message", icon: MessageSquare, href: "/projects" },
  { label: "Log Time", icon: Clock, href: "/tasks" },
  { label: "Upload File", icon: Paperclip, href: "/files" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
];

// A compact row of primary create/jump actions for the top of the dashboard.
export function QuickActions() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 hover:bg-accent transition-colors"
          >
            <Icon className="h-4 w-4 text-primary" />
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
