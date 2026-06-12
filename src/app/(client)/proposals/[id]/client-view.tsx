"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

type Section = { id: string; type: string; [key: string]: any };
type Brand = { primaryColor?: string; accentColor?: string; font?: string; logoUrl?: string };
type ProposalData = {
  id: string; title: string; status: string; currency: string; validUntil: string | null;
  sections: Section[]; totalAmount: number | null; sentAt: string | null;
  acceptedBy: string | null; respondedAt: string | null; createdAt: string;
  user: { id: string; name: string; companyName: string | null };
  brand?: Brand | null;
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
      {section.body.split("\n").map((line: string, i: number) => line ? <p key={i} className="text-gray-600 mb-3">{line}</p> : <br key={i} />)}
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
        <thead><tr className="border-b-2 border-gray-200">
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Service</th>
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Description</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700">Qty</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700">Unit Price</th>
          <th className="text-right py-3 font-semibold text-gray-700">Total</th>
        </tr></thead>
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
        <tfoot><tr className="border-t-2 border-gray-900">
          <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">Grand Total</td>
          <td className="py-3 text-right font-bold text-gray-900 text-lg">{formatCurrency(grandTotal, currency)}</td>
        </tr></tfoot>
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

function HeroSection({ section }: { section: Section }) {
  return (
    <div className="min-h-[320px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100" style={{ backgroundColor: section.bgColor || "#2563eb" }}>
      <h1 className="text-5xl font-bold text-white mb-4 leading-tight">{section.headline}</h1>
      {section.subheadline && <p className="text-xl text-white/80 mb-10">{section.subheadline}</p>}
      {section.ctaLabel && <a href={section.ctaUrl || "#"} className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow hover:shadow-md transition-shadow">{section.ctaLabel}</a>}
    </div>
  );
}

function ServicesSection({ section }: { section: Section }) {
  const items: any[] = section.items || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{section.heading}</h2>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item: any) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50">
            <div className="text-2xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection({ section }: { section: Section }) {
  const items: any[] = section.items || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{section.heading}</h2>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item: any) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <p className="text-4xl text-gray-200 font-serif mb-2">&ldquo;</p>
            <p className="text-gray-700 italic mb-4 text-sm">{item.quote}</p>
            <div className="border-t border-gray-100 pt-4">
              <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
              {item.role && <p className="text-gray-500 text-xs">{item.role}</p>}
              {item.company && <p className="text-gray-400 text-xs">{item.company}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSection({ section }: { section: Section }) {
  const items: any[] = section.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">{section.heading}</h2>
      <div className="space-y-3">
        {items.map((item: any, i: number) => (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              {item.question}<span className="text-gray-400 ml-4">{openIdx === i ? "−" : "+"}</span>
            </button>
            {openIdx === i && <div className="px-5 pb-4 text-gray-600 text-sm">{item.answer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaSection({ section }: { section: Section }) {
  return (
    <div className="py-16 text-center border-b border-gray-100" style={{ backgroundColor: section.bgColor || "#7c3aed" }}>
      <h2 className="text-3xl font-bold text-white mb-3">{section.heading}</h2>
      {section.subtext && <p className="text-white/80 mb-8">{section.subtext}</p>}
      {section.buttonLabel && <a href={section.buttonUrl || "#"} className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow hover:shadow-md transition-shadow">{section.buttonLabel}</a>}
    </div>
  );
}

function TimelineSection({ section }: { section: Section }) {
  const steps: any[] = section.steps || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">{section.heading}</h2>
      <div className="space-y-6">
        {steps.map((step: any, idx: number) => (
          <div key={step.id} className="flex gap-4">
            <div className="shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignatureSection({ section, proposal, onAccept, onDecline }: {
  section: Section; proposal: ProposalData; onAccept: (name: string) => Promise<void>; onDecline: () => Promise<void>;
}) {
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";
  async function handleAccept() { if (!signName.trim()) return; setAccepting(true); await onAccept(signName.trim()); setAccepting(false); }
  async function handleDecline() { if (!confirm("Are you sure you want to decline this proposal?")) return; setDeclining(true); await onDecline(); setDeclining(false); }
  if (proposal.status === "ACCEPTED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
        <div className="border border-green-200 bg-green-50 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800 mb-1">Proposal accepted. Thank you, {proposal.acceptedBy}!</h3>
          <p className="text-green-600 text-sm">Accepted on {new Date(proposal.respondedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>
    );
  }
  if (proposal.status === "DECLINED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center"><p className="text-red-800 font-semibold">This proposal was declined.</p></div>
      </div>
    );
  }
  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <p className="text-gray-500 mb-8">{section.message}</p>
      {canRespond && !showAcceptForm && (
        <div className="flex gap-4">
          <button onClick={() => setShowAcceptForm(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">Accept Proposal</button>
          <button onClick={handleDecline} disabled={declining} className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">{declining ? "Declining..." : "Decline"}</button>
        </div>
      )}
      {canRespond && showAcceptForm && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 space-y-4">
          <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Type your full name to sign</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Your full name" value={signName} onChange={(e) => setSignName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAccept()} autoFocus />
          </div>
          <div className="flex gap-3">
            <button onClick={handleAccept} disabled={!signName.trim() || accepting} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">{accepting ? "Signing..." : "Accept & Sign"}</button>
            <button onClick={() => setShowAcceptForm(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomAcceptUI({ proposal, onAccept, onDecline }: { proposal: ProposalData; onAccept: (name: string) => Promise<void>; onDecline: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  if (proposal.status === "ACCEPTED") {
    return (
      <div className="border-t-2 border-green-200 bg-green-50 py-10 px-12">
        <div className="max-w-4xl mx-auto text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800">Proposal accepted. Thank you, {proposal.acceptedBy}!</h3>
        </div>
      </div>
    );
  }
  if (proposal.status === "DECLINED") return <div className="border-t-2 border-red-200 bg-red-50 py-8 px-12"><p className="text-center text-red-700 font-semibold">This proposal was declined.</p></div>;
  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";
  if (!canRespond) return null;
  async function handleAccept() { if (!signName.trim()) return; setAccepting(true); await onAccept(signName.trim()); setAccepting(false); }
  async function handleDecline() { if (!confirm("Are you sure you want to decline this proposal?")) return; setDeclining(true); await onDecline(); setDeclining(false); }
  return (
    <div className="border-t border-gray-200 bg-gray-50 py-10 px-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to proceed?</h2>
        <p className="text-gray-500 text-sm mb-6">Accept this proposal to move forward, or decline if you have any concerns.</p>
        {!showForm ? (
          <div className="flex gap-4">
            <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">Accept Proposal</button>
            <button onClick={handleDecline} disabled={declining} className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">{declining ? "Declining..." : "Decline"}</button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Type your full name to sign</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Your full name" value={signName} onChange={(e) => setSignName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAccept()} autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAccept} disabled={!signName.trim() || accepting} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors">{accepting ? "Signing..." : "Accept & Sign"}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientProposalView({ proposal: initialProposal }: { proposal: ProposalData }) {
  const [proposal, setProposal] = useState(initialProposal);
  useEffect(() => {
    if (proposal.status === "SENT") {
      fetch(`/api/proposals/${proposal.id}/view`, { method: "POST" }).then((r) => { if (r.ok) setProposal((p) => ({ ...p, status: "VIEWED" })); });
    }
  }, []); // eslint-disable-line
  async function handleAccept(name: string) {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", name }) });
    if (res.ok) { const updated = await res.json(); setProposal((p) => ({ ...p, status: "ACCEPTED", acceptedBy: updated.acceptedBy, respondedAt: updated.respondedAt })); }
  }
  async function handleDecline() {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline" }) });
    if (res.ok) setProposal((p) => ({ ...p, status: "DECLINED" }));
  }
  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const hasSignatureSection = proposal.sections.some((s) => s.type === "signature");
  const brand = proposal.brand || {};
  const docStyle: React.CSSProperties = { fontFamily: brand.font && brand.font !== "Inter" ? brand.font : undefined };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={docStyle}>
        {brand.logoUrl && <div className="px-12 py-4 border-b border-gray-100 flex items-center"><img src={brand.logoUrl} alt="Company logo" className="h-8 object-contain" /></div>}
        <div className="px-12 py-2">
          {proposal.sections.map((section: Section) => {
            switch (section.type) {
              case "cover": return <CoverSection key={section.id} section={section} clientName={clientName} date={date} />;
              case "text": return <TextSection key={section.id} section={section} />;
              case "pricing": return <PricingSection key={section.id} section={section} currency={proposal.currency} />;
              case "terms": return <TermsSection key={section.id} section={section} />;
              case "signature": return <SignatureSection key={section.id} section={section} proposal={proposal} onAccept={handleAccept} onDecline={handleDecline} />;
              case "hero": return <HeroSection key={section.id} section={section} />;
              case "services": return <ServicesSection key={section.id} section={section} />;
              case "testimonials": return <TestimonialsSection key={section.id} section={section} />;
              case "faq": return <FaqSection key={section.id} section={section} />;
              case "cta": return <CtaSection key={section.id} section={section} />;
              case "timeline": return <TimelineSection key={section.id} section={section} />;
              default: return null;
            }
          })}
        </div>
        {!hasSignatureSection && <BottomAcceptUI proposal={proposal} onAccept={handleAccept} onDecline={handleDecline} />}
      </div>
    </div>
  );
}
