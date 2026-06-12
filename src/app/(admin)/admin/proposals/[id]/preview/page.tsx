import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

type Brand = { primaryColor?: string; accentColor?: string; font?: string; logoUrl?: string };
type Section = { id: string; type: string; [key: string]: any };

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

const DEFAULT_PRIMARY = "#0f172a";
const DEFAULT_ACCENT  = "#2dd4bf";

function CoverSection({ s, clientName, date, brand }: { s: Section; clientName: string; date: string; brand: Brand }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100">
      <h1 className="text-5xl font-bold mb-4" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.title}</h1>
      {s.subtitle && <p className="text-xl text-gray-500 mb-8">{s.subtitle}</p>}
      <div className="text-gray-400 text-sm space-y-1">
        <p>Prepared for <span className="font-medium text-gray-700">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function HeroSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-20 px-10 text-center border-b border-gray-100" style={{ background: s.bgColor || brand.primaryColor || DEFAULT_PRIMARY }}>
      <h2 className="text-4xl font-bold text-white mb-4">{s.headline}</h2>
      {s.subheadline && <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">{s.subheadline}</p>}
      {s.ctaLabel && (
        <span className="inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg"
          style={{ color: s.bgColor || brand.primaryColor || DEFAULT_PRIMARY }}>{s.ctaLabel}</span>
      )}
    </div>
  );
}

function TextSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      {(s.body || "").split("\n").map((line: string, i: number) =>
        line ? <p key={i} className="text-gray-600 mb-3">{line}</p> : <br key={i} />
      )}
    </div>
  );
}

function ServicesSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <div className="grid grid-cols-2 gap-4">
        {(s.items || []).map((item: any) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div><p className="font-semibold text-gray-900 mb-1">{item.name}</p><p className="text-sm text-gray-500">{item.description}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <div className="grid grid-cols-2 gap-4">
        {(s.items || []).map((item: any) => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-6">
            <div className="text-4xl text-gray-200 font-serif leading-none mb-3">"</div>
            <p className="text-gray-700 italic mb-4">{item.quote}</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: brand.accentColor || DEFAULT_ACCENT }}>{item.name?.[0]?.toUpperCase() || "?"}</div>
              <div><p className="text-sm font-semibold text-gray-900">{item.name}</p><p className="text-xs text-gray-400">{[item.role, item.company].filter(Boolean).join(", ")}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-6" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <div className="space-y-2">
        {(s.items || []).map((item: any) => (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 font-medium text-gray-900">{item.question}</div>
            <div className="px-4 py-3 text-gray-600 text-sm">{item.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-8" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      {(s.steps || []).map((step: any, idx: number, arr: any[]) => (
        <div key={step.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: brand.accentColor || DEFAULT_ACCENT }}>{idx + 1}</div>
            {idx < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="pb-6"><p className="font-semibold text-gray-900 mb-1">{step.title}</p><p className="text-gray-500 text-sm">{step.description}</p></div>
        </div>
      ))}
    </div>
  );
}

function PricingSection({ s, currency, brand }: { s: Section; currency: string; brand: Brand }) {
  const rows: any[] = s.rows || [];
  const total = rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0);
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-6" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {["Service","Description","Qty","Unit Price","Total"].map((h, i) => (
              <th key={i} className={`py-3 pr-4 font-semibold text-gray-700 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
            ))}
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

function CtaSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-16 px-10 text-center border-b border-gray-100" style={{ background: s.bgColor || brand.accentColor || DEFAULT_ACCENT }}>
      <h2 className="text-3xl font-bold text-white mb-3">{s.heading}</h2>
      {s.subtext && <p className="text-white/80 mb-8">{s.subtext}</p>}
      {s.buttonLabel && (
        <span className="inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg"
          style={{ color: s.bgColor || brand.accentColor || DEFAULT_ACCENT }}>{s.buttonLabel}</span>
      )}
    </div>
  );
}

function TermsSection({ s, brand }: { s: Section; brand: Brand }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{s.body}</div>
    </div>
  );
}

function SignatureSection({ s, proposal, brand }: { s: Section; proposal: any; brand: Brand }) {
  const accepted = proposal.status === "ACCEPTED";
  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold mb-4" style={{ color: brand.primaryColor || DEFAULT_PRIMARY }}>{s.heading}</h2>
      <p className="text-gray-500 mb-6">{s.message}</p>
      {accepted ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6">
          <p className="text-green-800 font-semibold">Accepted by <span className="italic">{proposal.acceptedBy}</span> on{" "}
            {new Date(proposal.respondedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
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

export default async function AdminProposalPreviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, companyName: true } } },
  });
  if (!proposal) notFound();
  const p = proposal!;
  const sections = (p.sections as any[]) || [];
  const brand: Brand = (p.brand as Brand) || {};
  const clientName = p.user.companyName || p.user.name;
  const date = new Date(p.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  function renderSection(section: Section) {
    const sp = { s: section, brand };
    switch (section.type) {
      case "cover":        return <CoverSection key={section.id} s={section} clientName={clientName} date={date} brand={brand} />;
      case "hero":         return <HeroSection key={section.id} {...sp} />;
      case "text":         return <TextSection key={section.id} {...sp} />;
      case "services":     return <ServicesSection key={section.id} {...sp} />;
      case "testimonials": return <TestimonialsSection key={section.id} {...sp} />;
      case "faq":          return <FaqSection key={section.id} {...sp} />;
      case "timeline":     return <TimelineSection key={section.id} {...sp} />;
      case "pricing":      return <PricingSection key={section.id} s={section} currency={String(p.currency)} brand={brand} />;
      case "cta":          return <CtaSection key={section.id} {...sp} />;
      case "terms":        return <TermsSection key={section.id} {...sp} />;
      case "signature":    return <SignatureSection key={section.id} s={section} proposal={p} brand={brand} />;
      default:             return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: brand.font || "Inter" }}>
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium sticky top-0 z-10">
        Preview — this is how your client will see this proposal
      </div>
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100"
          style={{ background: brand.primaryColor || DEFAULT_PRIMARY }}>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="logo" className="h-7 object-contain" />
          ) : (
            <span className="text-white/0">·</span>
          )}
          <span className="text-white/40 text-xs">Proposal</span>
        </div>
        <div className="px-12 py-2">
          {sections.map(renderSection)}
        </div>
      </div>
    </div>
  );
}
