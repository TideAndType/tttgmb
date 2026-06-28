import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getMonthlyRevenue() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return { year: d.getFullYear(), month: d.getMonth() };
  }).reverse();

  const results = await Promise.all(months.map(async ({ year, month }) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const agg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: "Paid", createdAt: { gte: start, lte: end } },
    });
    return { label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue: agg._sum.totalAmount ?? 0 };
  }));
  return results;
}

export default async function SuperAdminAnalyticsPage() {
  const [monthlyRevenue, taskCount, proposalCount, approvalCount, messageCount, fileCount] = await Promise.all([
    getMonthlyRevenue(),
    prisma.task.count(),
    prisma.proposal.count(),
    prisma.deliverable.count(),
    prisma.message.count(),
    prisma.clientFile.count(),
  ]);

  const maxRev = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
  const platformStats = [
    { label: "Tasks", value: taskCount },
    { label: "Proposals", value: proposalCount },
    { label: "Approvals", value: approvalCount },
    { label: "Messages", value: messageCount },
    { label: "Files", value: fileCount },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {monthlyRevenue.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-500">${m.revenue > 999 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue.toFixed(0)}</span>
                <div className="w-full bg-violet-100 dark:bg-violet-900/30 rounded-t-md transition-all" style={{ height: `${(m.revenue / maxRev) * 100}px` }}>
                  <div className="w-full h-full bg-violet-500 rounded-t-md" />
                </div>
                <span className="text-xs text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Platform Usage</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {platformStats.map(s => (
              <div key={s.label} className="text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
