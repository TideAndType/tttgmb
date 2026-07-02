import { Sidebar } from "@/components/nav/sidebar";
import { BrandProvider } from "@/components/providers/brand-provider";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExitImpersonationButton } from "@/components/nav/exit-impersonation-button";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationsSidebar } from "@/components/notifications/notifications-sidebar";
import { KeyboardShortcuts } from "@/components/keyboard/keyboard-shortcuts";

const CLIENT_NAV_SHORTCUTS = [
  { key: "d", label: "Dashboard", href: "/dashboard" },
  { key: "b", label: "My Bar", href: "/my-bar" },
  { key: "p", label: "Projects", href: "/projects" },
  { key: "t", label: "Tasks", href: "/tasks" },
  { key: "c", label: "Calendar", href: "/calendar" },
  { key: "k", label: "Keywords", href: "/keywords" },
  { key: "r", label: "Reports", href: "/reports" },
  { key: "m", label: "Messages", href: "/messages" },
  { key: "i", label: "Invoices", href: "/invoices" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const viewing = cookieStore.get("adminViewingAs");
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;

  let impersonationBanner: React.ReactNode = null;

  if (viewing?.value && (sessionUser?.role === "ADMIN" || sessionUser?.role === "SUPER_ADMIN")) {
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
        {/* pt-14 on mobile clears the fixed mobile top bar so the banner/content aren't hidden under it */}
        <div className="flex-1 flex flex-col overflow-auto min-w-0 pt-14 lg:pt-0">
          {impersonationBanner}
          <div className="px-4 lg:px-8 py-3 border-b border-border bg-background flex items-center gap-2">
            <div className="flex-1"><GlobalSearch /></div>
            <NotificationBell />
          </div>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
          <OnboardingWizard />
        </div>
        <NotificationsSidebar />
        <KeyboardShortcuts navShortcuts={CLIENT_NAV_SHORTCUTS} />
      </div>
    </BrandProvider>
  );
}
