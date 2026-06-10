"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/seo", label: "SEO Overview", icon: Search },
  { href: "/keywords", label: "Keywords", icon: Key },
  { href: "/brand-book", label: "Brand Book", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/time", label: "Time Tracking", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col min-h-screen">
      <div className="p-6 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client Portal</p>
        <h2 className="font-semibold text-foreground truncate">{user?.companyName || "My Company"}</h2>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.name}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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

      <div className="p-4 border-t border-border">
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
