import { Sidebar } from "@/components/nav/sidebar";
import { BrandProvider } from "@/components/providers/brand-provider";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExitImpersonationButton } from "@/components/nav/exit-impersonation-button";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const viewing = cookieStore.get("adminViewingAs");
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;

  let impersonationBanner: React.ReactNode = null;

  if (viewing?.value && sessionUser?.role === "ADMIN") {
    const clientUser = await prisma.user.findUnique({
      where: { id: viewing.value },
      select: { name: true, companyName: true },
    });

    if (clientUser) {
      impersonationBanner = (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium">
          <span>
            <strong>Admin view:</strong> Viewing portal as {clientUser.name}
            {clientUser.companyName && ` · ${clientUser.companyName}`}
          </span>
          <ExitImpersonationButton />
        </div>
      );
    }
  }

  return (
    <BrandProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto min-w-0">
          {impersonationBanner}
          <div className="px-4 lg:px-8 py-3 border-b border-border bg-background flex items-center gap-2">
            <div className="flex-1"><GlobalSearch /></div>
            <NotificationBell />
          </div>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </BrandProvider>
  );
}
