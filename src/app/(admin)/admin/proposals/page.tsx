import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Trash2, FileText } from "lucide-react";
import { DeleteProposalButton } from "./delete-button";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWED: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
};

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default async function AdminProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    include: { user: { select: { id: true, name: true, companyName: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
          <p className="text-muted-foreground mt-1">Manage client proposals</p>
        </div>
        <Link href="/admin/proposals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No proposals yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first proposal to get started</p>
          <Link href="/admin/proposals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Updated</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Viewed</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{proposal.user.companyName || proposal.user.name}</p>
                      <p className="text-xs text-muted-foreground">{proposal.user.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{proposal.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[proposal.status]}`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatCurrency(proposal.totalAmount, proposal.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(proposal.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {proposal.viewedAt ? (
                      <span
                        className="flex items-center gap-1 text-green-600 text-xs"
                        title={`First viewed ${new Date(proposal.viewedAt).toLocaleString()}${proposal.lastViewedAt ? ` · Last viewed ${new Date(proposal.lastViewedAt).toLocaleString()}` : ""}`}
                      >
                        <Eye className="h-3 w-3" />
                        {new Date(proposal.lastViewedAt ?? proposal.viewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {proposal.viewCount > 1 && (
                          <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            {proposal.viewCount}×
                          </span>
                        )}
                      </span>
                    ) : proposal.sentAt ? (
                      <span className="text-xs text-muted-foreground">Not yet</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/proposals/${proposal.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/proposals/${proposal.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteProposalButton id={proposal.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
