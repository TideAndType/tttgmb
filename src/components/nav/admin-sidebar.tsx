"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { WorkspaceSwitcher } from "@/components/nav/workspace-switcher";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  LogOut,
  CheckSquare,
  FolderOpen,
  Clock,
  CheckCircle,
  FileText,
  Settings,
  Receipt,
  Activity,
  MessageCircle,
  AlertCircle,
  CalendarDays,
  GanttChart,
  Folder,
  Instagram,
  Video,
  Webhook,
  ClipboardList,
  UserCog,
  ChevronDown,
  ChevronRight,
  Megaphone,
  LifeBuoy,
  Sparkles,
  BookOpen,
} from "lucide-react";

const navGroups: {
  title: string;
  items: { href: string; label: string; icon: React.ElementType; exact?: boolean }[];
}[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/marketing", label: "Marketing OS", icon: Sparkles },
      { href: "/admin/activity", label: "Activity", icon: Activity },
      { href: "/admin/overdue", label: "Overdue", icon: AlertCircle },
    ],
  },
  {
    title: "Clients",
    items: [
      { href: "/admin/clients/new", label: "New Client", icon: UserPlus },
      { href: "/admin/messages", label: "Messages", icon: MessageCircle },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/checkins", label: "Check-ins", icon: MessageCircle },
      { href: "/admin/meetings", label: "Meetings", icon: Video },
    ],
  },
  {
    title: "Work",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderOpen },
      { href: "/admin/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/admin/approvals", label: "Approvals", icon: CheckCircle },
      { href: "/admin/time", label: "Time", icon: Clock },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/timeline", label: "Timeline", icon: GanttChart },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/proposals", label: "Proposals", icon: FileText },
      { href: "/admin/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    title: "Content & Tools",
    items: [
      { href: "/admin/files", label: "Files", icon: Folder },
      { href: "/admin/content", label: "Content", icon: Instagram },
      { href: "/admin/forms", label: "Intake Forms", icon: ClipboardList },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
];

interface AppSettings {
  appName: string;
  logoFilename: string | null;
}

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: "Client Portal",
    logoFilename: null,
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Restore which groups the user collapsed.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("adminNavCollapsed");
      if (saved) setCollapsed(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try { localStorage.setItem("adminNavCollapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAppSettings({
          appName: data.appName ?? "Client Portal",
          logoFilename: data.logoFilename ?? null,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <WorkspaceSwitcher agencyName={appSettings.appName} logoFilename={appSettings.logoFilename} />
        <p className="text-xs text-muted-foreground mt-2 px-1">{session?.user?.name}</p>
      </div>

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {navGroups.map((group) => {
          // A group is shown expanded unless the user collapsed it — but always
          // expand the group that contains the current page.
          const hasActive = group.items.some((item) =>
            item.exact ? pathname === item.href : pathname.startsWith(item.href)
          );
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
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
          href="/admin/account"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith("/admin/account")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <UserCog className="h-4 w-4" />
          My Account
        </Link>
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith("/admin/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
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

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col min-h-screen">
        <AdminSidebarContent />
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
        <span className="text-sm font-semibold text-foreground">Admin Panel</span>
        <div className="w-8" />
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Backdrop */}
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
          <AdminSidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
