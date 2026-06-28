import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWED: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
};

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default async function ClientProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  const proposals = await prisma.proposal.findMany({
    where: {
      userId: user.id,
      status: { not: "DRAFT" },
    },
    orderBy: { sentAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
        <p className="text-muted-foreground mt-1">Review and accept proposals from our team</p>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <FileText className="h-14 w-14 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No proposals yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            When we send you a proposal, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-lg border border-border bg-card p-5 flex items-center gap-4"
            >
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{proposal.title}</h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                      STATUS_COLORS[proposal.status] || ""
                    }`}
                  >
                    {proposal.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {proposal.totalAmount != null && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(proposal.totalAmount, proposal.currency)}
                    </span>
                  )}
                  {proposal.sentAt && (
                    <span>
                      Sent{" "}
                      {new Date(proposal.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {proposal.validUntil && (
                    <span>
                      Valid until{" "}
                      {new Date(proposal.validUntil).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/proposals/${proposal.id}`}>
                <Button size="sm">
                  View Proposal
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
