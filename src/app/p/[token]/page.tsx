import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { createNotificationForAdmins } from "@/lib/notifications";
import { toEmbedUrl } from "@/lib/embed";
import { sectionWrapper } from "@/lib/section-style";
import { resolveMergeFields } from "@/lib/merge-fields";

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
        {(section.body || "").split("\n").map((line: string, i: number) =>
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
      {section.ctaLabel && <span className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow">{section.ctaLabel}</span>}
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

function CtaSection({ section }: { section: Section }) {
  return (
    <div className="py-16 text-center border-b border-gray-100" style={{ backgroundColor: section.bgColor || "#7c3aed" }}>
      <h2 className="text-3xl font-bold text-white mb-3">{section.heading}</h2>
      {section.subtext && <p className="text-white/80 mb-8">{section.subtext}</p>}
      {section.buttonLabel && <span className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg shadow">{section.buttonLabel}</span>}
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
          <p className="text-green-800 font-semibold">Accepted by <span className="italic">{proposal.acceptedBy}</span></p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400">
          <p>To accept this proposal, please log into your client portal.</p>
        </div>
      )}
    </div>
  );
}

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { shareToken: params.token },
    include: { user: { select: { name: true, companyName: true } } },
  });
  if (!proposal) notFound();

  // Record the public view (first view + repeat views + count)
  const now = new Date();
  const firstView = proposal.status === "SENT";
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      ...(firstView ? { status: "VIEWED", viewedAt: now } : {}),
      ...(proposal.viewedAt ? {} : { viewedAt: now }),
      lastViewedAt: now,
      viewCount: { increment: 1 },
    },
  }).catch(() => {});
  if (firstView) {
    await createNotificationForAdmins("proposal_viewed", "Proposal viewed", `"${proposal.title}" was opened via share link`, "/admin/proposals");
  }

  const rawSections = (proposal.sections as any[]) || [];
  const brand = (proposal.brand as Brand | null) || {};
  const clientName = proposal.user.companyName || proposal.user.name;
  const date = new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sections = resolveMergeFields(rawSections, {
    clientName: proposal.user.name,
    company: proposal.user.companyName || "",
    contactEmail: (proposal.user as any).email || "",
    date,
    proposalValue: proposal.totalAmount != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: proposal.currency || "USD" }).format(proposal.totalAmount) : "",
  });
  const docStyle = brand.font && brand.font !== "Inter" ? { fontFamily: brand.font } : {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white max-w-4xl mx-auto my-8 rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={docStyle}>
        {brand.logoUrl && (
          <div className="px-12 py-4 border-b border-gray-100 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoUrl} alt="Company logo" className="h-8 object-contain" />
          </div>
        )}
        <div className="px-12 py-2">
          {sections.map((section: Section) => {
            if (section.settings?.hidden) return null;
            const w = sectionWrapper(section.settings);
            const node = (() => {
            switch (section.type) {
              case "cover": return <CoverSection key={section.id} section={section} clientName={clientName} date={date} />;
              case "text": return <TextSection key={section.id} section={section} />;
              case "pricing": return <PricingSection key={section.id} section={section} currency={proposal.currency} />;
              case "terms": return <TermsSection key={section.id} section={section} />;
              case "hero": return <HeroSection key={section.id} section={section} />;
              case "services": return <ServicesSection key={section.id} section={section} />;
              case "cta": return <CtaSection key={section.id} section={section} />;
              case "signature": return <SignatureSection key={section.id} section={section} proposal={proposal} />;
              case "image": return section.url ? (
                <div key={section.id} className="px-10 py-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={section.url} alt={section.caption || "Image"} className="w-full rounded-lg" />
                  {section.caption && <p className="text-center text-sm text-gray-500 mt-2">{section.caption}</p>}
                </div>
              ) : null;
              case "video": {
                const e = toEmbedUrl(section.url);
                return e ? (
                  <div key={section.id} className="px-10 py-8">
                    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
                      {e.kind === "iframe"
                        ? <iframe src={e.src} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                        : <video src={e.src} controls className="absolute inset-0 w-full h-full" />}
                    </div>
                    {section.caption && <p className="text-center text-sm text-gray-500 mt-2">{section.caption}</p>}
                  </div>
                ) : null;
              }
              default: return null;
            }
            })();
            if (!node) return null;
            return (
              <div key={section.id} style={w.style} className={w.alignClass}>
                {w.hasInner ? <div className={w.innerClass}>{node}</div> : node}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 pb-8">This proposal is shared via a public link. <a href="/login" className="underline">Log in</a> to accept or decline.</p>
    </div>
  );
}
