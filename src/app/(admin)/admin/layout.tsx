import { AdminSidebar } from "@/components/nav/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
