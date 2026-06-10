import { Sidebar } from "@/components/nav/sidebar";
import { BrandProvider } from "@/components/providers/brand-provider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </BrandProvider>
  );
}
