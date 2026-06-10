import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

type Section = {
  id: string;
  type: string;
  [key: string]: any;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function CoverSection({ section, clientName, date }: { section: Section; clientName: string; date: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">{section.title}</h1>
      {section.subtitle && <p className="text-xl text-gray-500 mb-8">{section.subtitle}</p>}
      <div className="text-gray-400 text-sm space-y-1">
        <p>Prepared for <span className="font-medium text-gray-700">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function TextSection({ section }: { section: Section }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <div className="prose prose-gray max-w-none">
        {section.body.split("\n").map((line: string, i: number) =>
          line ? <p key={i} className="text-gray-600 mb-3">{line}</p> : <br key={i} />
        )}
      </div>
    </div>
  );
}

function PricingSection({ section, currency }: { section: Section; currency: string }) {
  const rows = section.rows || [];
  const grandTotal = rows.reduce((sum: number, r: any) => sum + r.qty * r.unitPrice, 0);
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.heading}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 pr-4 font-semibold text-gray-700">Service</th>
            <th className="text-left py-3 pr-4 font-semibold text-gray-700">Description</th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-700">Qty</th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-700">Unit Price</th>
            <th className="text-right py-3 font-semibold text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium text-gray-900">{row.service}</td>
              <td className="py-3 pr-4 text-gray-500">{row.description}</td>
              <td className="py-3 pr-4 text-right text-gray-700">{row.qty}</td>
              <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(row.unitPrice, currency)}</td>
              <td className="py-3 text-right text-gray-900">{formatCurrency(row.qty * row.unitPrice, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">Grand Total</td>
            <td className="py-3 text-right font-bold text-gray-900 text-lg">{formatCurrency(grandTotal, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TermsSection({ section }: { section: Section }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{section.body}</div>
    </div>
  );
}

function SignatureSection({ section, proposal }: { section: Section; proposal: any }) {
  const accepted = proposal.status === "ACCEPTED";
  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <p className="text-gray-500 mb-6">{section.message}</p>
      {accepted ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6">
          <p className="text-green-800 font-semibold">
            Accepted by <span className="italic">{proposal.acceptedBy}</span> on{" "}
            {new Date(proposal.respondedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      ) : proposal.status === "DECLINED" ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6">
          <p className="text-red-800 font-semibold">This proposal was declined.</p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400">
          <p>Signature pending — client has not yet accepted.</p>
        </div>
      )}
    </div>
  );
}

export default async function AdminProposalPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, companyName: true } } },
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
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner */}
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
        Preview mode — this is how your client will see this proposal
      </div>

      {/* Proposal content */}
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 px-12 py-2">
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
  );
}
