"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

type Brand = {
  primaryColor?: string;
  accentColor?: string;
  font?: string;
  logoUrl?: string;
};

type Section = { id: string; type: string; [key: string]: any };

type ProposalData = {
  id: string; title: string; status: string; currency: string;
  validUntil: string | null; sections: Section[]; totalAmount: number | null;
  sentAt: string | null; acceptedBy: string | null; respondedAt: string | null;
  createdAt: string; brand?: Brand | null;
  user: { id: string; name: string; companyName: string | null };
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

// ─── Section renderers ────────────────────────────────────────────────────────

function CoverSection({ section, clientName, date, brand }: { section: Section; clientName: string; date: string; brand: Brand }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100">
      <h1 className="text-5xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.title}</h1>
      {section.subtitle && <p className="text-xl text-gray-500 mb-8">{section.subtitle}</p>}
      <div className="text-gray-400 text-sm space-y-1">
        <p>Prepared for <span className="font-medium text-gray-700">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function HeroSection({ section, brand }: { section: Section; brand: Brand }) {
  return (
    <div className="py-20 px-10 text-center border-b border-gray-100" style={{ background: section.bgColor || brand.primaryColor || "#0f172a" }}>
      <h2 className="text-4xl font-bold text-white mb-4">{section.headline}</h2>
      {section.subheadline && <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">{section.subheadline}</p>}
      {section.ctaLabel && (
        <span className="inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg"
          style={{ color: section.bgColor || brand.primaryColor || "#0f172a" }}>
          {section.ctaLabel}
        </span>
      )}
    </div>
  );
}

function TextSection({ section, brand }: { section: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      {section.body.split("\n").map((line: string, i: number) =>
        line ? <p key={i} className="text-gray-600 mb-3">{line}</p> : <br key={i} />
      )}
    </div>
  );
}

function ServicesSection({ section, brand }: { section: Section; brand: Brand }) {
  const items: any[] = section.items || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection({ section, brand }: { section: Section; brand: Brand }) {
  const items: any[] = section.items || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-6">
            <div className="text-4xl text-gray-200 font-serif leading-none mb-3">"</div>
            <p className="text-gray-700 italic mb-4 leading-relaxed">{item.quote}</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: brand.accentColor || "#2dd4bf" }}>
                {item.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">{[item.role, item.company].filter(Boolean).join(", ")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSection({ section, brand }: { section: Section; brand: Brand }) {
  const items: any[] = section.items || [];
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-6" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left font-medium text-gray-900 hover:bg-gray-100 transition-colors">
              <span>{item.question}</span>
              <span className="text-gray-400 ml-2">{open[item.id] ? "−" : "+"}</span>
            </button>
            {open[item.id] && (
              <div className="px-4 py-3 text-gray-600 text-sm leading-relaxed">{item.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSection({ section, brand }: { section: Section; brand: Brand }) {
  const steps: any[] = section.steps || [];
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <div className="space-y-0">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: brand.accentColor || "#2dd4bf" }}>
                {idx + 1}
              </div>
              {idx < steps.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            <div className="pb-6">
              <p className="font-semibold text-gray-900 mb-1">{step.title}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSection({ section, currency, brand }: { section: Section; currency: string; brand: Brand }) {
  const rows: any[] = section.rows || [];
  const total = rows.reduce((s, r) => s + r.qty * r.unitPrice, 0);
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-6" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium text-gray-900">{row.service}</td>
              <td className="py-3 pr-4 text-gray-500">{row.description}</td>
              <td className="py-3 pr-4 text-right text-gray-700">{row.qty}</td>
              <td className="py-3 pr-4 text-right text-gray-700">{fmt(row.unitPrice, currency)}</td>
              <td className="py-3 text-right text-gray-900">{fmt(row.qty * row.unitPrice, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">Grand Total</td>
            <td className="py-3 text-right font-bold text-gray-900 text-lg">{fmt(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CtaSection({ section, brand }: { section: Section; brand: Brand }) {
  return (
    <div className="py-16 px-10 text-center border-b border-gray-100"
      style={{ background: section.bgColor || brand.accentColor || "#2dd4bf" }}>
      <h2 className="text-3xl font-bold text-white mb-3">{section.heading}</h2>
      {section.subtext && <p className="text-white/80 mb-8">{section.subtext}</p>}
      {section.buttonLabel && (
        <span className="inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg"
          style={{ color: section.bgColor || brand.accentColor || "#2dd4bf" }}>
          {section.buttonLabel}
        </span>
      )}
    </div>
  );
}

function TermsSection({ section, brand }: { section: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{section.body}</div>
    </div>
  );
}

function SignatureSection({ section, proposal, brand, onAccept, onDecline }: {
  section: Section; proposal: ProposalData; brand: Brand;
  onAccept: (name: string) => Promise<void>; onDecline: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";
  const accent = brand.accentColor || "#2dd4bf";

  if (proposal.status === "ACCEPTED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
        <div className="border border-green-200 bg-green-50 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            Proposal accepted. Thank you, {proposal.acceptedBy}!
          </h3>
          <p className="text-green-600 text-sm">
            Accepted on {new Date(proposal.respondedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    );
  }

  if (proposal.status === "DECLINED") {
    return (
      <div className="py-10">
        <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
        <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold">This proposal was declined.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || "#0f172a" }}>{section.heading}</h2>
      <p className="text-gray-500 mb-8">{section.message}</p>
      {canRespond && !showForm && (
        <div className="flex gap-4">
          <button onClick={() => setShowForm(true)}
            className="flex-1 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            style={{ background: accent }}>
            Accept Proposal
          </button>
          <button onClick={async () => { if (!confirm("Decline this proposal?")) return; setDeclining(true); await onDecline(); setDeclining(false); }}
            disabled={declining}
            className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {declining ? "Declining..." : "Decline"}
          </button>
        </div>
      )}
      {canRespond && showForm && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 space-y-4">
          <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
          <label className="block text-sm text-gray-600 mb-1">Type your full name to sign</label>
          <input type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ "--tw-ring-color": accent } as any}
            placeholder="Your full name" value={signName}
            onChange={(e) => setSignName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signName.trim() && (async () => { setAccepting(true); await onAccept(signName.trim()); setAccepting(false); })()}
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={async () => { if (!signName.trim()) return; setAccepting(true); await onAccept(signName.trim()); setAccepting(false); }}
              disabled={!signName.trim() || accepting}
              className="flex-1 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: accent }}>
              {accepting ? "Signing..." : "Accept & Sign"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomAcceptUI({ proposal, brand, onAccept, onDecline }: {
  proposal: ProposalData; brand: Brand;
  onAccept: (name: string) => Promise<void>; onDecline: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [signName, setSignName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const accent = brand.accentColor || "#2dd4bf";

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
  if (proposal.status === "DECLINED") {
    return (
      <div className="border-t-2 border-red-200 bg-red-50 py-8 px-12">
        <p className="text-center text-red-700 font-semibold">This proposal was declined.</p>
      </div>
    );
  }
  const canRespond = proposal.status === "SENT" || proposal.status === "VIEWED";
  if (!canRespond) return null;
  return (
    <div className="border-t border-gray-200 bg-gray-50 py-10 px-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to proceed?</h2>
        <p className="text-gray-500 text-sm mb-6">Accept this proposal to move forward.</p>
        {!showForm ? (
          <div className="flex gap-4">
            <button onClick={() => setShowForm(true)}
              className="text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              style={{ background: accent }}>
              Accept Proposal
            </button>
            <button onClick={async () => { if (!confirm("Decline this proposal?")) return; setDeclining(true); await onDecline(); setDeclining(false); }}
              disabled={declining}
              className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50">
              {declining ? "Declining..." : "Decline"}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Sign to Accept</h3>
            <input type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2"
              placeholder="Your full name" value={signName}
              onChange={(e) => setSignName(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button onClick={async () => { if (!signName.trim()) return; setAccepting(true); await onAccept(signName.trim()); setAccepting(false); }}
                disabled={!signName.trim() || accepting}
                className="flex-1 text-white font-semibold py-2.5 px-6 rounded-lg disabled:opacity-50"
                style={{ background: accent }}>
                {accepting ? "Signing..." : "Accept & Sign"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ClientProposalView({ proposal: initial }: { proposal: ProposalData }) {
  const [proposal, setProposal] = useState(initial);
  const brand: Brand = proposal.brand ?? {};

  useEffect(() => {
    if (proposal.status === "SENT") {
      fetch(`/api/proposals/${proposal.id}/view`, { method: "POST" }).then((r) => {
        if (r.ok) setProposal((p) => ({ ...p, status: "VIEWED" }));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept(name: string) {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", name }),
    });
    if (res.ok) {
      const u = await res.json();
      setProposal((p) => ({ ...p, status: "ACCEPTED", acceptedBy: u.acceptedBy, respondedAt: u.respondedAt }));
    }
  }

  async function handleDecline() {
    const res = await fetch(`/api/proposals/${proposal.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    if (res.ok) setProposal((p) => ({ ...p, status: "DECLINED" }));
  }

  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const hasSignature = proposal.sections.some((s) => s.type === "signature");

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: brand.font || "Inter" }}>
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Brand header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100"
          style={{ background: brand.primaryColor || "#0f172a" }}>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="logo" className="h-7 object-contain" />
          ) : (
            <span className="text-white/0 text-sm font-semibold">·</span>
          )}
          <span className="text-white/40 text-xs">Proposal</span>
        </div>

        <div className="px-12 py-2">
          {proposal.sections.map((section) => {
            const p = { section, brand };
            switch (section.type) {
              case "cover":        return <CoverSection key={section.id} section={section} clientName={clientName} date={date} brand={brand} />;
              case "hero":         return <HeroSection key={section.id} {...p} />;
              case "text":         return <TextSection key={section.id} {...p} />;
              case "services":     return <ServicesSection key={section.id} {...p} />;
              case "testimonials": return <TestimonialsSection key={section.id} {...p} />;
              case "faq":          return <FaqSection key={section.id} {...p} />;
              case "timeline":     return <TimelineSection key={section.id} {...p} />;
              case "pricing":      return <PricingSection key={section.id} section={section} currency={proposal.currency} brand={brand} />;
              case "cta":          return <CtaSection key={section.id} {...p} />;
              case "terms":        return <TermsSection key={section.id} {...p} />;
              case "signature":    return <SignatureSection key={section.id} section={section} proposal={proposal} brand={brand} onAccept={handleAccept} onDecline={handleDecline} />;
              default:             return null;
            }
          })}
        </div>

        {!hasSignature && (
          <BottomAcceptUI proposal={proposal} brand={brand} onAccept={handleAccept} onDecline={handleDecline} />
        )}
      </div>
    </div>
  );
}
