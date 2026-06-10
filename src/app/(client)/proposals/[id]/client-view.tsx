"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

type Section = {
  id: string;
  type: string;
  [key: string]: any;
};

type ProposalData = {
  id: string;
  title: string;
  status: string;
  currency: string;
  validUntil: string | null;
  sections: Section[];
  totalAmount: number | null;
  sentAt: string | null;
  acceptedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; companyName: string | null };
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function CoverSection({
  section,
  clientName,
  date,
}: {
  section: Section;
  clientName: string;
  date: string;
}) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">{section.title}</h1>
      {section.subtitle && <p className="text-xl text-gray-500 mb-8">{section.subtitle}</p>}
      <div className="text-gray-400 text-sm space-y-1">
        <p>
          Prepared for <span className="font-medium text-gray-700">{clientName}</span>
        </p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function TextSection({ section }: { section: Section }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      {section.body.split("\n").map((line: string, i: number) =>
        line ? (
          <p key={i} className="text-gray-600 mb-3">
            {line}
          </p>
        ) : (
          <br key={i} />
        )
      )}
    </div>
  );
}

function PricingSection({
  section,
  currency,
}: {
  section: Section;
  currency: string;
}) {
  const rows = section.rows || [];
  const grandTotal = rows.reduce(
    (sum: number, r: any) => sum + r.qty * r.unitPrice,
    0
  );
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
              <td className="py-3 pr-4 text-right text-gray-700">
                {formatCurrency(row.unitPrice, currency)}
              </td>
              <td className="py-3 text-right text-gray-900">
                {formatCurrency(row.qty * row.unitPrice, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">
              Grand Total
            </td>
            <td className="py-3 text-right font-bold text-gray-900 text-lg">
              {formatCurrency(grandTotal, currency)}
            </td>
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
      <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
        {section.body}
      </div>
    </div>
  );
}

function SignatureSection({
  section,
  proposal,
  onAccept,
  onDecline,
}: {
  section: Section;
  proposal: ProposalData;
  onAccept: (name: string) => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";

  async function handleAccept() {
    if (!signName.trim()) return;
    setAccepting(true);
    await onAccept(signName.trim());
    setAccepting(false);
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline this proposal?")) return;
    setDeclining(true);
    await onDecline();
    setDeclining(false);
  }

  if (proposal.status === "ACCEPTED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
        <div className="border border-green-200 bg-green-50 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            Proposal accepted. Thank you, {proposal.acceptedBy}!
          </h3>
          <p className="text-green-600 text-sm">
            Accepted on{" "}
            {new Date(proposal.respondedAt!).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (proposal.status === "DECLINED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold">This proposal was declined.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <p className="text-gray-500 mb-8">{section.message}</p>

      {canRespond && !showAcceptForm && (
        <div className="flex gap-4">
          <button
            onClick={() => setShowAcceptForm(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Accept Proposal
          </button>
          <button
            onClick={handleDecline}
            disabled={declining}
            className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {declining ? "Declining..." : "Decline"}
          </button>
        </div>
      )}

      {canRespond && showAcceptForm && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 space-y-4">
          <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Type your full name to sign
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your full name"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAccept()}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={!signName.trim() || accepting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              {accepting ? "Signing..." : "Accept & Sign"}
            </button>
            <button
              onClick={() => setShowAcceptForm(false)}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bottom accept/decline UI if no signature section
function BottomAcceptUI({
  proposal,
  onAccept,
  onDecline,
}: {
  proposal: ProposalData;
  onAccept: (name: string) => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  if (proposal.status === "ACCEPTED") {
    return (
      <div className="border-t-2 border-green-200 bg-green-50 py-10 px-12">
        <div className="max-w-4xl mx-auto text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800">
            Proposal accepted. Thank you, {proposal.acceptedBy}!
          </h3>
        </div>
      </div>
    );
  }

  if (proposal.status === "DECLINED") {
    return (
      <div className="border-t-2 border-red-200 bg-red-50 py-8 px-12">
        <p className="text-center text-red-700 font-semibold">This proposal was declined.</p>
      </div>
    );
  }

  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";
  if (!canRespond) return null;

  async function handleAccept() {
    if (!signName.trim()) return;
    setAccepting(true);
    await onAccept(signName.trim());
    setAccepting(false);
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline this proposal?")) return;
    setDeclining(true);
    await onDecline();
    setDeclining(false);
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 py-10 px-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to proceed?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Accept this proposal to move forward, or decline if you have any concerns.
        </p>
        {!showForm ? (
          <div className="flex gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Accept Proposal
            </button>
            <button
              onClick={handleDecline}
              disabled={declining}
              className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {declining ? "Declining..." : "Decline"}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Type your full name to sign
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Your full name"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAccept()}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={!signName.trim() || accepting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                {accepting ? "Signing..." : "Accept & Sign"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientProposalView({ proposal: initialProposal }: { proposal: ProposalData }) {
  const [proposal, setProposal] = useState(initialProposal);

  // Mark as viewed on mount
  useEffect(() => {
    if (proposal.status === "SENT") {
      fetch(`/api/proposals/${proposal.id}/view`, { method: "POST" }).then((r) => {
        if (r.ok) {
          setProposal((p) => ({ ...p, status: "VIEWED" }));
        }
      });
    }
  }, []);

  async function handleAccept(name: string) {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", name }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProposal((p) => ({
        ...p,
        status: "ACCEPTED",
        acceptedBy: updated.acceptedBy,
        respondedAt: updated.respondedAt,
      }));
    }
  }

  async function handleDecline() {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    if (res.ok) {
      setProposal((p) => ({ ...p, status: "DECLINED" }));
    }
  }

  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hasSignatureSection = proposal.sections.some((s) => s.type === "signature");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-12 py-2">
          {proposal.sections.map((section: Section) => {
            switch (section.type) {
              case "cover":
                return (
                  <CoverSection
                    key={section.id}
                    section={section}
                    clientName={clientName}
                    date={date}
                  />
                );
              case "text":
                return <TextSection key={section.id} section={section} />;
              case "pricing":
                return (
                  <PricingSection
                    key={section.id}
                    section={section}
                    currency={proposal.currency}
                  />
                );
              case "terms":
                return <TermsSection key={section.id} section={section} />;
              case "signature":
                return (
                  <SignatureSection
                    key={section.id}
                    section={section}
                    proposal={proposal}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                );
              default:
                return null;
            }
          })}
        </div>

        {!hasSignatureSection && (
          <BottomAcceptUI
            proposal={proposal}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
      </div>
    </div>
  );
}
