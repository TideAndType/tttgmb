"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { permissionForPath, hasPermission } from "@/lib/permissions";
import {
  LayoutDashboard, KanbanSquare, Sparkles, Activity, Menu, X,
  CheckSquare, FolderOpen, CalendarDays, Receipt, MessageCircle, User,
  Users, FileText, Search, Star, Bookmark, Plug, Mail, Workflow, FileInput, CalendarClock,
} from "lucide-react";

// App-style bottom navigation for the client portal on mobile. The four
// primary destinations plus a "More" sheet covering the rest of the nav.
const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/marketing", label: "Marketing", icon: Sparkles },
  { href: "/activity", label: "Activity", icon: Activity },
];

const MORE_GROUPS: { title: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    title: "Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/my-bar", label: "My Bar", icon: Bookmark },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/crm/contacts", label: "Contacts", icon: Users },
      { href: "/crm/forms", label: "Forms", icon: FileInput },
      { href: "/crm/booking", label: "Booking", icon: CalendarClock },
      { href: "/crm/campaigns", label: "Campaigns", icon: Mail },
      { href: "/crm/workflows", label: "Workflows", icon: Workflow },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/seo", label: "SEO", icon: Search },
      { href: "/marketing/reputation", label: "Reputation", icon: Star },
      { href: "/marketing/content", label: "Content", icon: FileText },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/messages", label: "Messages", icon: MessageCircle },
      { href: "/settings", label: "Settings", icon: Plug },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet on navigation; lock body scroll while open.
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const canSee = (href: string) => {
    const key = permissionForPath(href);
    return !key || hasPermission(user?.permissions, key);
  };

  const isActive = (href: string) =>
    href === "/crm"
      ? pathname === "/crm" || pathname.startsWith("/crm/")
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[75vh] overflow-y-auto p-4 pb-[calc(88px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            {MORE_GROUPS.map((g) => {
              const visible = g.items.filter((i) => canSee(i.href));
              if (!visible.length) return null;
              return (
                <div key={g.title} className="mb-4">
                  <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{g.title}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {visible.map((i) => {
                      const Icon = i.icon;
                      return (
                        <Link key={i.href} href={i.href} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-3 text-center">
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="text-[11px] font-medium text-foreground leading-tight">{i.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="mobile-tabbar lg:hidden" aria-label="Primary">
        {TABS.filter((t) => canSee(t.href)).map((t) => {
          const Icon = t.icon;
          const active = isActive(t.href) && !moreOpen;
          return (
            <Link key={t.href} href={t.href} className={cn(active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen((o) => !o)} className={cn(moreOpen ? "text-primary" : "text-muted-foreground")} aria-label="More">
          {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          More
        </button>
      </nav>
    </>
  );
}
