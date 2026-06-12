import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { GlobalSearch } from "@/components/search/global-search";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-auto min-w-0">
        <div className="px-4 lg:px-8 py-3 border-b border-border bg-background"><GlobalSearch /></div>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
