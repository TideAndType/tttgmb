"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BarChart2, Shield, UserCog, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/analytics", label: "Analytics", icon: BarChart2 },
];

function NavInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-400" />
          <span className="font-bold text-sm">Super Admin</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Platform</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/super-admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-gray-800 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <Link href="/super-admin/account" onClick={onNavigate} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
          <UserCog className="w-4 h-4" /> My Account
        </Link>
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white">← Back to Admin</Link>
      </div>
    </div>
  );
}

export function SuperAdminSidebar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-gray-900 text-white flex-col min-h-screen">
        <NavInner />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gray-900 text-white border-b border-gray-800">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1.5 rounded-md text-gray-300 hover:bg-gray-800 transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-violet-400" /> Super Admin</span>
        <div className="w-8" />
      </div>
      <div className="lg:hidden h-14 flex-shrink-0" />

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 w-72 h-full bg-gray-900 text-white transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-3 border-b border-gray-800">
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1.5 rounded-md text-gray-300 hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto">
          <NavInner onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
