import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, FileText, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    adminCount,
    clientCount,
    newThisMonth,
    totalProjects,
    totalProposals,
    invoiceStats,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.project.count(),
    prisma.proposal.count(),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, _count: true }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ]);

  const totalRevenue = invoiceStats._sum.totalAmount ?? 0;

  const stats = [
    { label: "Total Users", value: totalUsers.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Admin Accounts", value: adminCount.toLocaleString(), icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Client Portals", value: clientCount.toLocaleString(), icon: Users, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "New This Month", value: newThisMonth.toLocaleString(), icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Total Projects", value: totalProjects.toLocaleString(), icon: FolderOpen, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/20" },
    { label: "Total Proposals", value: totalProposals.toLocaleString(), icon: FileText, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-900/20" },
    { label: "Total Invoices", value: invoiceStats._count.toLocaleString(), icon: Receipt, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Invoice Volume", value: `$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: Receipt, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
  ];

  const roleColors: Record<string, string> = { SUPER_ADMIN: "bg-violet-100 text-violet-700", ADMIN: "bg-blue-100 text-blue-700", CLIENT: "bg-green-100 text-green-700" };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {me?.name}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-400">Name</th>
                <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left py-2 font-semibold text-gray-600 dark:text-gray-400">Joined</th>
              </tr></thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                    <td className="py-2.5 text-gray-500">{u.email}</td>
                    <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] ?? "bg-gray-100 text-gray-600"}`}>{u.role}</span></td>
                    <td className="py-2.5 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
