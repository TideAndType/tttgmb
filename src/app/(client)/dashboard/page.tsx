import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Clock,
  Timer,
  Receipt,
  Search,
  Key,
  BookOpen,
  BarChart2,
  FileText,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Link from "next/link";

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
    prisma.task.count({ where: { userId, status: { not: "COMPLETED" } } }),
    prisma.deliverable.count({ where: { userId, status: "PENDING" } }),
    prisma.timeEntry.aggregate({
      _sum: { minutes: true },
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { userId, status: { in: ["Unpaid", "Partial", "Pending"] } },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
    prisma.deliverable.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.invoice.findFirst({
      where: { userId },
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
    prisma.project.findMany({ where: { userId }, select: { id: true, name: true } }),
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

  const statCards = [
    {
      label: "Open Tasks",
      value: openTaskCount.toString(),
      icon: CheckSquare,
      href: "/tasks",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending Approvals",
      value: pendingApprovalCount.toString(),
      icon: Clock,
      href: "/approvals",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Hours This Month",
      value: `${hoursThisMonth}h`,
      icon: Timer,
      href: "/time",
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstandingAmount),
      icon: Receipt,
      href: "/invoices",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ];

  const quickLinks = [
    { label: "SEO Overview", icon: Search, href: "/seo" },
    { label: "Keywords", icon: Key, href: "/keywords" },
    { label: "Brand Book", icon: BookOpen, href: "/brand-book" },
    { label: "Reports", icon: BarChart2, href: "/reports" },
    { label: "Time Tracking", icon: Timer, href: "/time" },
    { label: "Proposals", icon: FileText, href: "/proposals" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground mt-1">{companyName}</p>
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

      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className={`inline-flex p-2 rounded-md ${card.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Row 2 — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (wider) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No open tasks</p>
              ) : (
                <>
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                    >
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                          task.status === "IN_PROGRESS"
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                      <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                      {task.dueDate && (
                        <span
                          className={`text-xs ${
                            isOverdue(task.dueDate) ? "text-red-500 font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      <Badge variant={priorityColor[task.priority] as any} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-3">
                    <Link
                      href="/tasks"
                      className="text-sm text-primary hover:underline"
                    >
                      View all tasks →
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {recentMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No messages yet</p>
              ) : (
                <>
                  {recentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {projectMap[msg.projectId] ?? "Project"} &middot;{" "}
                          {msg._count.comments} comment{msg._count.comments !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3">
                    <Link href="/projects" className="text-sm text-primary hover:underline">
                      View all projects →
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All caught up ✓</p>
              ) : (
                <>
                  {pendingApprovals.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {d.type}
                        </Badge>
                      </div>
                      <Link
                        href={`/approvals`}
                        className="text-xs text-primary hover:underline flex-shrink-0"
                      >
                        Review →
                      </Link>
                    </div>
                  ))}
                  <div className="pt-3">
                    <Link href="/approvals" className="text-sm text-primary hover:underline">
                      View all →
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Latest Invoice */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Latest Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {!latestInvoice ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {latestInvoice.number ? `#${latestInvoice.number}` : "Invoice"}
                    </span>
                    <Badge
                      variant={
                        latestInvoice.status === "Paid"
                          ? "default"
                          : latestInvoice.status === "Unpaid"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {latestInvoice.status}
                    </Badge>
                  </div>
                  {latestInvoice.totalAmount !== null && (
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(latestInvoice.totalAmount, latestInvoice.currency)}
                    </p>
                  )}
                  {latestInvoice.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(latestInvoice.dueDate)}
                    </p>
                  )}
                  <div className="pt-2">
                    <Link href="/invoices" className="text-sm text-primary hover:underline">
                      View all invoices →
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Links
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickLinks.map((ql) => {
            const Icon = ql.icon;
            return (
              <Link key={ql.href} href={ql.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer text-center">
                  <CardContent className="pt-4 pb-4">
                    <Icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
                    <p className="text-xs text-muted-foreground leading-tight">{ql.label}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
