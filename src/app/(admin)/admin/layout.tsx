import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationsSidebar } from "@/components/notifications/notifications-sidebar";
import { KeyboardShortcuts } from "@/components/keyboard/keyboard-shortcuts";

const ADMIN_NAV_SHORTCUTS = [
  { key: "d", label: "Dashboard", href: "/admin" },
  { key: "p", label: "Projects", href: "/admin/projects" },
  { key: "t", label: "Tasks", href: "/admin/tasks" },
  { key: "c", label: "Calendar", href: "/admin/calendar" },
  { key: "a", label: "Approvals", href: "/admin/approvals" },
  { key: "r", label: "Proposals", href: "/admin/proposals" },
  { key: "i", label: "Invoices", href: "/admin/invoices" },
  { key: "m", label: "Messages", href: "/admin/messages" },
  { key: "s", label: "Support", href: "/admin/support" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-auto min-w-0 pt-14 lg:pt-0">
        <div className="px-4 lg:px-8 py-3 border-b border-border bg-background flex items-center gap-2">
          <div className="flex-1"><GlobalSearch /></div>
          <NotificationBell />
        </div>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
      <NotificationsSidebar />
      <KeyboardShortcuts navShortcuts={ADMIN_NAV_SHORTCUTS} />
    </div>
  );
}
