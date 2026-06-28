import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Section = { id: string; type: string; [key: string]: any };
type Brand = { primaryColor?: string; accentColor?: string; font?: string; logoUrl?: string };

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
        {section.body.split("\n").map((line: string, i: number) => line ? <p key={i} className="text-gray-600 mb-3">{line}</p> : <br key={i} />)}
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

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&playsinline=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  return null;
}

function VideoBackground({ url }: { url: string }) {
  const embed = getEmbedUrl(url);
  if (!embed) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <iframe src={embed} style={{ position: "absolute", top: "50%", left: "50%", width: "177.78vh", minWidth: "100%", height: "56.25vw", minHeight: "100%", transform: "translate(-50%,-50%)", border: 0 }} allow="autoplay; fullscreen" />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
    </div>
  );
}

function HeroSection({ section }: { section: Section }) {
  const hasVideo = !!section.bgVideo;
  return (
    <div className="min-h-[320px] flex flex-col items-center justify-center text-center py-20 border-b border-gray-100" style={{ position: "relative", overflow: "hidden", ...(hasVideo ? {} : { backgroundColor: section.bgColor || "#2563eb" }) }}>
      {hasVideo && <VideoBackground url={section.bgVideo} />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">{section.headline}</h1>
        {section.subheadline && <p className="text-xl text-white/80 mb-10">{section.subheadline}</p>}
        {section.ctaLabel && <span className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow">{section.ctaLabel}</span>}
      </div>
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
  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">{section.heading}</h2>
      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
            <p className="text-gray-600 text-sm">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaSection({ section }: { section: Section }) {
  const hasVideo = !!section.bgVideo;
  return (
    <div className="py-16 text-center border-b border-gray-100" style={{ position: "relative", overflow: "hidden", ...(hasVideo ? {} : { backgroundColor: section.bgColor || "#7c3aed" }) }}>
      {hasVideo && <VideoBackground url={section.bgVideo} />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 className="text-3xl font-bold text-white mb-3">{section.heading}</h2>
        {section.subtext && <p className="text-white/80 mb-8">{section.subtext}</p>}
        {section.buttonLabel && <span className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow">{section.buttonLabel}</span>}
      </div>
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

function SignatureSection({ section, proposal }: { section: Section; proposal: any }) {
  const accepted = proposal.status === "ACCEPTED";
  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
      <p className="text-gray-500 mb-6">{section.message}</p>
      {accepted ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6">
          <p className="text-green-800 font-semibold">Accepted by <span className="italic">{proposal.acceptedBy}</span> on {new Date(proposal.respondedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          {proposal.signatureData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proposal.signatureData} alt="Client signature" className="mt-3 h-20 object-contain bg-white rounded border border-green-200 px-2" />
          )}
          {proposal.acceptedByIp && <p className="text-green-700/70 text-xs mt-2">Signed from IP {proposal.acceptedByIp}</p>}
        </div>
      ) : proposal.status === "DECLINED" ? (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6"><p className="text-red-800 font-semibold">This proposal was declined.</p></div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400"><p>Signature pending — client has not yet accepted.</p></div>
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
  const sections = (proposal.sections as any[]) || [];
  const brand = (proposal.brand as Brand | null) || {};
  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const docStyle = brand.font && brand.font !== "Inter" ? { fontFamily: brand.font } : {};
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-4">
        <span>Preview mode — this is how your client will see this proposal</span>
        <a href={`/admin/proposals/${proposal.id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors">&#11015; Download PDF</a>
      </div>
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={docStyle}>
        {brand.logoUrl && <div className="px-12 py-4 border-b border-gray-100 flex items-center"><img src={brand.logoUrl} alt="Company logo" className="h-8 object-contain" /></div>}
        <div className="px-12 py-2">
          {sections.map((section: Section) => {
            switch (section.type) {
              case "cover": return <CoverSection key={section.id} section={section} clientName={clientName} date={date} />;
              case "text": return <TextSection key={section.id} section={section} />;
              case "pricing": return <PricingSection key={section.id} section={section} currency={proposal.currency} />;
              case "terms": return <TermsSection key={section.id} section={section} />;
              case "signature": return <SignatureSection key={section.id} section={section} proposal={proposal} />;
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
      </div>
    </div>
  );
}
