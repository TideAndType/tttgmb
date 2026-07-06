"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/components/providers/brand-provider";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { permissionForPath, hasPermission } from "@/lib/permissions";
import {
  LayoutDashboard,
  Search,
  Key,
  BookOpen,
  LogOut,
  BarChart2,
  CheckSquare,
  FolderOpen,
  Clock,
  CheckCircle,
  FileText,
  Receipt,
  MessageCircle,
  User,
  MapPin,
  CalendarDays,
  GanttChart,
  Paperclip,
  LifeBuoy,
  Eye,
  Video,
  Activity,
  ClipboardList,
  Bookmark,
  Sparkles,
  Target,
  Swords,
  Star,
  Workflow,
  Globe,
  Plug,
  KanbanSquare,
  Users,
  FileInput,
  CalendarClock,
  Mail,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const navGroups: {
  title: string;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/my-bar", label: "My Bar", icon: Bookmark },
      { href: "/activity", label: "Everything", icon: Activity },
    ],
  },
  {
    title: "Marketing OS",
    items: [
      { href: "/marketing", label: "Workspace", icon: Sparkles },
      { href: "/marketing/assistant", label: "AI Assistant", icon: MessageCircle },
      { href: "/marketing/content", label: "Content Studio", icon: FileText },
      { href: "/marketing/calendar", label: "Content Calendar", icon: CalendarDays },
      { href: "/marketing/tasks", label: "Task Engine", icon: Target },
      { href: "/marketing/competitors", label: "Competitors", icon: Swords },
      { href: "/marketing/reputation", label: "Reputation", icon: Star },
      { href: "/marketing/website", label: "Website Advisor", icon: Globe },
      { href: "/marketing/seo-scan", label: "SEO & Local Scan", icon: Search },
      { href: "/marketing/reports", label: "Reports", icon: BarChart2 },
      { href: "/marketing/automations", label: "Automations", icon: Workflow },
      { href: "/marketing/knowledge", label: "Knowledge Base", icon: BookOpen },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/crm", label: "Pipeline", icon: KanbanSquare },
      { href: "/crm/contacts", label: "Contacts", icon: Users },
      { href: "/crm/forms", label: "Forms", icon: FileInput },
      { href: "/crm/booking", label: "Booking", icon: CalendarClock },
      { href: "/crm/campaigns", label: "Email Campaigns", icon: Mail },
    ],
  },
  {
    title: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/approvals", label: "Approvals", icon: CheckCircle },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/timeline", label: "Timeline", icon: GanttChart },
      { href: "/meetings", label: "Meetings", icon: Video },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/ai-visibility", label: "AI Visibility", icon: Eye },
      { href: "/seo", label: "SEO Overview", icon: Search },
      { href: "/keywords", label: "Keywords", icon: Key },
      { href: "/reports", label: "Reports", icon: BarChart2 },
      { href: "/gmb", label: "My Business", icon: MapPin },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/brand-book", label: "Brand Book", icon: BookOpen },
      { href: "/files", label: "Files", icon: Paperclip },
      { href: "/forms", label: "Forms", icon: ClipboardList },
      { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      { href: "/support", label: "Help & Support", icon: LifeBuoy },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const { logoUrl } = useBrand();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("clientNavCollapsed");
      if (saved) setCollapsed(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try { localStorage.setItem("clientNavCollapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const canSee = (href: string) => {
    const key = permissionForPath(href);
    return !key || hasPermission(user?.permissions, key);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        {logoUrl && (
          <div className="mb-3">
            <img
              src={logoUrl}
              alt="Company logo"
              style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client Portal</p>
        <h2 className="font-semibold text-foreground truncate">{user?.companyName || "My Company"}</h2>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.name}</p>
      </div>

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => canSee(item.href));
          if (visible.length === 0) return null; // hide groups the client has no access to
          const hasActive = visible.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
          const isOpen = hasActive || !collapsed[group.title];
          return (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                {group.title}
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {visible.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        <Link
          href="/messages"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/messages" || pathname.startsWith("/messages/")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <MessageCircle className="h-4 w-4 flex-shrink-0" />
          Messages
        </Link>
        <Link
          href="/profile"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/profile" || pathname.startsWith("/profile/")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          Profile
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Plug className="h-4 w-4 flex-shrink-0" />
          Settings
        </Link>
        <div className="flex items-center justify-between">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-foreground">Client Portal</span>
        <div className="w-8" />
      </div>

      {/* Mobile spacer to push content below top bar */}
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 w-72 h-full bg-card border-r border-border transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-3 border-b border-border">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
