import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Timer,
  Search,
  Key,
  BookOpen,
  BarChart2,
  FileText,
  CheckCircle2,
  Circle,
  CheckSquare,
  MessageSquare,
  ThumbsUp,
  CalendarDays,
  Receipt,
  Compass,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { AiVisibilityWidget } from "@/components/dashboard-ai-visibility";
import { UserAvatar } from "@/components/ui/avatar";
import { CheckInsWidget } from "@/components/checkins/checkins-widget";

export const dynamic = "force-dynamic";

function Avatar({ name, image }: { name: string; image?: string | null }) {
  return <UserAvatar name={name} seed={name} image={image} className="h-9 w-9 text-xs ring-2 ring-card -ml-2 first:ml-0" />;
}

// Basecamp-style module card: centered title (with icon) + underline rule, then content.
function Module({ title, icon: Icon, children, footerHref, footerLabel }: { title: string; icon?: any; children: React.ReactNode; footerHref?: string; footerLabel?: string }) {
  return (
    <Card className="flex flex-col">
      <div className="text-center px-5 pt-5 pb-3 border-b border-border">
        <h3 className="font-bold text-foreground inline-flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </h3>
      </div>
      <CardContent className="pt-4 flex-1">{children}</CardContent>
      {footerHref && (
        <div className="px-5 pb-4">
          <Link href={footerHref} className="text-sm text-primary hover:underline">{footerLabel ?? "View all"} →</Link>
        </div>
      )}
    </Card>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(date: Date | string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(date: Date | string | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

const priorityColor: Record<string, string> = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string;
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const companyName = (session?.user as any)?.companyName ?? "Your Company";

  const companyUserIds = await getCompanyUserIds(userId);

  // ── Batch 1 — all independent queries ─────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    openTaskCount,
    pendingApprovalCount,
    timeResult,
    invoiceOutstanding,
    upcomingTasks,
    pendingApprovals,
    latestInvoice,
    user,
    projects,
  ] = await Promise.all([
    prisma.task.count({ where: { userId: { in: companyUserIds }, status: { not: "COMPLETED" } } }),
    prisma.deliverable.count({ where: { userId: { in: companyUserIds }, status: "PENDING" } }),
    prisma.timeEntry.aggregate({
      _sum: { minutes: true },
      where: { userId: { in: companyUserIds }, date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { userId: { in: companyUserIds }, status: { in: ["Unpaid", "Partial", "Pending"] } },
    }),
    prisma.task.findMany({
      where: { userId: { in: companyUserIds }, status: { not: "COMPLETED" } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
    prisma.deliverable.findMany({
      where: { userId: { in: companyUserIds }, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.invoice.findFirst({
      where: { userId: { in: companyUserIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyName: true,
        gscProperty: true,
        _count: { select: { brandAssets: true, brandColors: true, brandFonts: true } },
      },
    }),
    prisma.project.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true, name: true } }),
  ]);

  const hoursThisMonth = ((timeResult._sum.minutes ?? 0) / 60).toFixed(1);
  const outstandingAmount = invoiceOutstanding._sum.totalAmount ?? 0;

  const projectIds = projects.map((p) => p.id);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  // ── Onboarding checklist ──────────────────────────────────────────
  const hasLogo = (user?._count.brandAssets ?? 0) > 0;

  const onboardingSteps = [
    {
      label: "Add your company name",
      done: !!user?.companyName,
      href: "/profile",
    },
    {
      label: "Connect Google Search Console",
      done: !!user?.gscProperty,
      href: "/seo",
    },
    {
      label: "Upload your logo",
      done: hasLogo,
      href: "/brand-book",
    },
    {
      label: "Add brand colors",
      done: (user?._count.brandColors ?? 0) > 0,
      href: "/brand-book",
    },
    {
      label: "Add brand fonts",
      done: (user?._count.brandFonts ?? 0) > 0,
      href: "/brand-book",
    },
  ];
  const onboardingComplete = onboardingSteps.every((s) => s.done);
  const onboardingProgress = onboardingSteps.filter((s) => s.done).length;

  // ── Batch 2 — needs projectIds ─────────────────────────────────────
  const recentMessages = await prisma.message.findMany({
    where: { projectId: { in: projectIds } },
    include: { _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const teamUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: { id: true, name: true, image: true },
    take: 16,
  });

  const announcements = await prisma.announcement.findMany({
    where: { userId: { in: companyUserIds } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const quickLinks = [
    { label: "SEO Overview", icon: Search, href: "/seo" },
    { label: "Keywords", icon: Key, href: "/keywords" },
    { label: "Brand Book", icon: BookOpen, href: "/brand-book" },
    { label: "Reports", icon: BarChart2, href: "/reports" },
    { label: "Proposals", icon: FileText, href: "/proposals" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header — centered, Basecamp style */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <h1 className="text-3xl font-bold text-foreground mt-0.5">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {firstName}</p>
        {teamUsers.length > 0 && (
          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center justify-center">
              {teamUsers.map((u) => (
                <Avatar key={u.id} name={u.name} image={u.image} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">The team</p>
          </div>
        )}
      </div>

      {/* Onboarding checklist — hidden once all steps complete */}
      {!onboardingComplete && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Get started</CardTitle>
              <span className="text-sm text-muted-foreground">
                {onboardingProgress} / {onboardingSteps.length} complete
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 mt-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${(onboardingProgress / onboardingSteps.length) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {onboardingSteps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.done ? "#" : step.href}
                    className={`flex items-center gap-3 text-sm rounded-md px-2 py-1.5 -mx-2 transition-colors ${
                      step.done
                        ? "text-muted-foreground cursor-default"
                        : "text-foreground hover:bg-primary/10"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={step.done ? "line-through" : ""}>{step.label}</span>
                    {!step.done && (
                      <span className="ml-auto text-xs text-primary">→</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Announcements from your agency */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="border-primary/30 bg-primary/5">
              <CardContent className="py-4 flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{a.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Automatic check-ins */}
      <CheckInsWidget />

      {/* Module grid — Basecamp-style equal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* To-dos */}
        <Module title="To-dos" icon={CheckSquare} footerHref="/tasks" footerLabel="View all tasks">
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No open tasks ✓</p>
          ) : (
            <div className="space-y-0">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${task.status === "IN_PROGRESS" ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                  <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                  {task.dueDate && (
                    <span className={`text-xs ${isOverdue(task.dueDate) ? "text-red-500 font-medium" : "text-muted-foreground"}`}>{formatDate(task.dueDate)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Module>

        {/* Message Board */}
        <Module title="Message Board" icon={MessageSquare} footerHref="/projects" footerLabel="View all projects">
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-0">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {projectMap[msg.projectId] ?? "Project"} &middot; {msg._count.comments} comment{msg._count.comments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(msg.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Module>

        {/* Approvals */}
        <Module title="Approvals" icon={ThumbsUp} footerHref="/approvals" footerLabel="View all">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">All caught up ✓</p>
          ) : (
            <div className="space-y-0">
              {pendingApprovals.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">{d.type}</Badge>
                  </div>
                  <Link href="/approvals" className="text-xs text-primary hover:underline flex-shrink-0">Review →</Link>
                </div>
              ))}
            </div>
          )}
        </Module>

        {/* Schedule */}
        <Module title="Schedule" icon={CalendarDays} footerHref="/calendar" footerLabel="Open calendar">
          <div className="text-center py-2">
            {openTaskCount > 0 ? (
              <>
                <p className="text-3xl font-bold text-foreground">{openTaskCount}</p>
                <p className="text-sm text-muted-foreground mt-1">open task{openTaskCount !== 1 ? "s" : ""}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Nothing scheduled</p>
            )}
          </div>
        </Module>

        {/* Latest Invoice */}
        <Module title="Invoices" icon={Receipt} footerHref="/invoices" footerLabel="View all invoices">
          {!latestInvoice ? (
            <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{latestInvoice.number ? `#${latestInvoice.number}` : "Invoice"}</span>
                <Badge variant={latestInvoice.status === "Paid" ? "default" : latestInvoice.status === "Unpaid" ? "destructive" : "secondary"} className="text-xs">
                  {latestInvoice.status}
                </Badge>
              </div>
              {latestInvoice.totalAmount !== null && (
                <p className="text-2xl font-bold text-foreground">{formatCurrency(latestInvoice.totalAmount, latestInvoice.currency)}</p>
              )}
              <p className="text-xs text-muted-foreground">{formatCurrency(outstandingAmount)} outstanding</p>
            </div>
          )}
        </Module>

        {/* Explore — quick links (Docs & Files analog) */}
        <Module title="Explore" icon={Compass}>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((ql) => {
              const Icon = ql.icon;
              return (
                <Link key={ql.href} href={ql.href} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:border-primary/50 hover:bg-accent transition-colors">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{ql.label}</span>
                </Link>
              );
            })}
          </div>
        </Module>

        {/* AI Visibility — full-width module spanning the grid */}
        <div className="md:col-span-2 xl:col-span-3">
          <AiVisibilityWidget />
        </div>
      </div>
    </div>
  );
}
