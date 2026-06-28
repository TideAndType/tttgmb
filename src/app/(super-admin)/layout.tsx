import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, BarChart2, Shield, UserCog } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-56 shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-sm">Super Admin</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Platform</p>
          {[
            { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/super-admin/users", label: "Users", icon: Users },
            { href: "/super-admin/analytics", label: "Analytics", icon: BarChart2 },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <Link href="/super-admin/account" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            <UserCog className="w-4 h-4" /> My Account
          </Link>
          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white">← Back to Admin</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
