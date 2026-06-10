"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
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
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/clients/new", label: "New Client", icon: UserPlus },
  { href: "/admin/proposals", label: "Proposals", icon: FileText },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/projects", label: "Projects", icon: FolderOpen },
  { href: "/admin/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/admin/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/admin/time", label: "Time", icon: Clock },
];

interface AppSettings {
  appName: string;
  logoFilename: string | null;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: "Client Portal",
    logoFilename: null,
  });

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
    <aside className="w-64 bg-card border-r border-border flex flex-col min-h-screen">
      <div className="p-6 border-b border-border">
        {appSettings.logoFilename && (
          <div className="mb-3">
            <img
              src={`/api/uploads/${appSettings.logoFilename}`}
              alt="App logo"
              style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Admin Panel</p>
        <h2 className="font-semibold text-foreground">{appSettings.appName}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{session?.user?.name}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        <Link
          href="/admin/settings"
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
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
