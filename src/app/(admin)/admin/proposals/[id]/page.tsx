import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminProposalNotes } from "./notes";
import { Edit, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Section = {
  id: string;
  type: string;
  [key: string]: any;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

function CoverSection({ section, clientName, date }: { section: Section; clientName: string; date: string }) {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center text-center py-16 border-b border-gray-100">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">{section.title}</h1>
      {section.subtitle && <p className="text-lg text-gray-500 mb-6">{section.subtitle}</p>}
      <div className="text-gray-400 text-sm">
        <p>Prepared for <span className="font-medium text-gray-700">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function TextSection({ section }: { section: Section }) {
  return (
    <div className="py-8 border-b border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{section.heading}</h2>
      {section.body.split("\n").map((line: string, i: number) =>
        line ? <p key={i} className="text-gray-600 mb-2 text-sm">{line}</p> : <br key={i} />
      )}
    </div>
  );
}

function PricingSection({ section, currency }: { section: Section; currency: string }) {
  const rows = section.rows || [];
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.qty * r.unitPrice, 0);
  return (
    <div className="py-8 border-b border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 pr-4 font-semibold text-gray-700">Service</th>
            <th className="text-left py-2 pr-4 font-semibold text-gray-700">Description</th>
            <th className="text-right py-2 pr-4 font-semibold text-gray-700">Qty</th>
            <th className="text-right py-2 pr-4 font-semibold text-gray-700">Unit Price</th>
            <th className="text-right py-2 font-semibold text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-medium text-gray-900">{row.service}</td>
              <td className="py-2 pr-4 text-gray-500">{row.description}</td>
              <td className="py-2 pr-4 text-right text-gray-700">{row.qty}</td>
              <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(row.unitPrice, currency)}</td>
              <td className="py-2 text-right text-gray-900">{formatCurrency(row.qty * row.unitPrice, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-2 pr-4 text-right font-bold text-gray-900">Grand Total</td>
            <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(grandTotal, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TermsSection({ section }: { section: Section }) {
  return (
    <div className="py-8 border-b border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{section.heading}</h2>
      <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{section.body}</div>
    </div>
  );
}

function SignatureSection({ section, proposal }: { section: Section; proposal: any }) {
  const accepted = proposal.status === "ACCEPTED";
  return (
    <div className="py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{section.heading}</h2>
      <p className="text-gray-500 text-sm mb-4">{section.message}</p>
      {accepted ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <p className="text-green-800 font-semibold text-sm">
            Accepted by <span className="italic">{proposal.acceptedBy}</span> on{" "}
            {new Date(proposal.respondedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {proposal.signatureData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proposal.signatureData} alt="Client signature" className="mt-3 h-20 object-contain bg-white rounded border border-green-200 px-2" />
          )}
          {proposal.acceptedByIp && (
            <p className="text-green-700/70 text-xs mt-2">Signed from IP {proposal.acceptedByIp}</p>
          )}
        </div>
      ) : proposal.status === "DECLINED" ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-red-800 font-semibold text-sm">This proposal was declined.</p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
          Awaiting client signature.
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  label,
  date,
  active,
  note,
}: {
  label: string;
  date: string | null;
  active: boolean;
  note?: string | null;
}) {
  return (
    <div className={`flex items-start gap-3 ${active ? "opacity-100" : "opacity-40"}`}>
      <div
        className={`mt-0.5 h-3 w-3 rounded-full shrink-0 ${
          active ? "bg-primary" : "bg-muted border border-border"
        }`}
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

export default async function AdminProposalViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, companyName: true, email: true } } },
  });

  if (!proposal) notFound();

  const sections = (proposal.sections as any[]) || [];
  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full min-h-screen">
      {/* Proposal content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mb-4">
          <Link href="/admin/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <div className="bg-white max-w-3xl mx-auto rounded-xl shadow-sm border border-gray-100 px-10 py-2">
          {sections.map((section: Section) => {
            switch (section.type) {
              case "cover":
                return <CoverSection key={section.id} section={section} clientName={clientName} date={date} />;
              case "text":
                return <TextSection key={section.id} section={section} />;
              case "pricing":
                return <PricingSection key={section.id} section={section} currency={proposal.currency} />;
              case "terms":
                return <TermsSection key={section.id} section={section} />;
              case "signature":
                return <SignatureSection key={section.id} section={section} proposal={proposal} />;
              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Right info panel */}
      <div className="w-72 border-l border-border bg-card shrink-0 overflow-y-auto p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Status</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              STATUS_COLORS[proposal.status] || STATUS_COLORS.DRAFT
            }`}
          >
            {proposal.status}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
          <div className="space-y-3">
            <TimelineItem label="Created" date={proposal.createdAt.toISOString()} active />
            <TimelineItem
              label="Sent"
              date={proposal.sentAt?.toISOString() ?? null}
              active={!!proposal.sentAt}
            />
            <TimelineItem
              label="Viewed"
              date={proposal.viewedAt?.toISOString() ?? null}
              active={!!proposal.viewedAt}
              note={
                proposal.viewedAt
                  ? `${proposal.viewCount} view${proposal.viewCount === 1 ? "" : "s"}${
                      proposal.lastViewedAt && proposal.viewCount > 1
                        ? ` · last ${new Date(proposal.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : ""
                    }`
                  : null
              }
            />
            <TimelineItem
              label={proposal.status === "DECLINED" ? "Declined" : "Accepted"}
              date={proposal.respondedAt?.toISOString() ?? null}
              active={!!proposal.respondedAt}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Client</h3>
          <p className="text-sm text-foreground font-medium">{proposal.user.companyName || proposal.user.name}</p>
          <p className="text-xs text-muted-foreground">{proposal.user.name}</p>
          <p className="text-xs text-muted-foreground">{proposal.user.email}</p>
        </div>

        {proposal.totalAmount != null && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Total</h3>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(proposal.totalAmount, proposal.currency)}
            </p>
          </div>
        )}

        {proposal.validUntil && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Valid Until</h3>
            <p className="text-sm text-foreground">
              {new Date(proposal.validUntil).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Actions</h3>
          <Link href={`/admin/proposals/${proposal.id}/edit`}>
            <Button variant="outline" size="sm" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Edit Proposal
            </Button>
          </Link>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Admin Notes</h3>
          <AdminProposalNotes proposalId={proposal.id} initialNotes={proposal.notes || ""} />
        </div>
      </div>
    </div>
  );
}
