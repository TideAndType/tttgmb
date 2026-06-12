"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText, Type, Table, ScrollText, PenLine, Plus, X, Eye,
  Send, Check, Loader2, GripVertical, Copy, Trash2, Sparkles,
  Users, MessageSquare, HelpCircle, Zap, LayoutTemplate, Palette,
  Monitor, Smartphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PricingRow = { id: string; service: string; description: string; qty: number; unitPrice: number };
type ServiceItem = { id: string; icon: string; name: string; description: string };
type TestimonialItem = { id: string; quote: string; name: string; role: string; company: string };
type FaqItem = { id: string; question: string; answer: string };
type TimelineStep = { id: string; title: string; description: string };

type Section =
  | { id: string; type: "cover"; title: string; subtitle: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "pricing"; heading: string; rows: PricingRow[] }
  | { id: string; type: "terms"; heading: string; body: string }
  | { id: string; type: "signature"; heading: string; message: string }
  | { id: string; type: "hero"; headline: string; subheadline: string; ctaLabel: string; bgColor: string }
  | { id: string; type: "services"; heading: string; items: ServiceItem[] }
  | { id: string; type: "testimonials"; heading: string; items: TestimonialItem[] }
  | { id: string; type: "faq"; heading: string; items: FaqItem[] }
  | { id: string; type: "cta"; heading: string; subtext: string; buttonLabel: string; bgColor: string }
  | { id: string; type: "timeline"; heading: string; steps: TimelineStep[] };

type Brand = {
  primaryColor: string;
  accentColor: string;
  font: string;
  logoUrl: string;
};

type Proposal = {
  id: string; title: string; status: string; currency: string;
  validUntil: string | null; sections: Section[]; totalAmount: number | null;
  notes: string | null; brand: Brand | null;
  user: { id: string; name: string; companyName: string | null };
};

const DEFAULT_BRAND: Brand = {
  primaryColor: "#0f172a",
  accentColor: "#2dd4bf",
  font: "Inter",
  logoUrl: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nid() { return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function computeTotal(sections: Section[]) {
  return sections.reduce((t, s) => {
    if (s.type === "pricing") return t + s.rows.reduce((r, row) => r + row.qty * row.unitPrice, 0);
    return t;
  }, 0);
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

const SECTION_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  cover:        { icon: FileText,      label: "Cover",           color: "text-violet-500" },
  hero:         { icon: Sparkles,      label: "Hero Banner",     color: "text-orange-500" },
  text:         { icon: Type,          label: "Text Block",      color: "text-blue-500" },
  pricing:      { icon: Table,         label: "Pricing Table",   color: "text-green-500" },
  services:     { icon: Zap,           label: "Services",        color: "text-yellow-500" },
  testimonials: { icon: MessageSquare, label: "Testimonials",    color: "text-pink-500" },
  faq:          { icon: HelpCircle,    label: "FAQ",             color: "text-cyan-500" },
  timeline:     { icon: LayoutTemplate,label: "Timeline",        color: "text-indigo-500" },
  cta:          { icon: Sparkles,      label: "Call to Action",  color: "text-rose-500" },
  terms:        { icon: ScrollText,    label: "Terms",           color: "text-gray-500" },
  signature:    { icon: PenLine,       label: "Signature",       color: "text-teal-500" },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:    "bg-gray-100 text-gray-600 border-gray-200",
  SENT:     "bg-blue-100 text-blue-700 border-blue-200",
  VIEWED:   "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
};

const FONTS = ["Inter", "Georgia", "Merriweather", "Montserrat", "Playfair Display"];

// ─── ContentEditable wrapper ──────────────────────────────────────────────────

function Editable({
  sectionId, value, onChange, tag = "div", className = "", placeholder = "", singleLine = false, style,
}: {
  sectionId: string; value: string; onChange: (v: string) => void;
  tag?: keyof JSX.IntrinsicElements; className?: string; placeholder?: string; singleLine?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    if (ref.current) ref.current.innerText = value ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const Tag = tag as any;
  return (
    <Tag ref={ref} contentEditable suppressContentEditableWarning
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(e: any) => { composing.current = false; onChange(e.currentTarget.innerText); }}
      onInput={(e: any) => { if (!composing.current) onChange(e.currentTarget.innerText); }}
      onKeyDown={(e: any) => { if (singleLine && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      className={`outline-none cursor-text ${className}`}
      data-placeholder={placeholder}
      style={style}
    />
  );
}

// ─── Sortable sidebar item ────────────────────────────────────────────────────

function SortableItem({
  section, isActive, onClick, onDuplicate, onDelete,
}: {
  section: Section; isActive: boolean; onClick: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const meta = SECTION_META[section.type] ?? SECTION_META.text;
  const Icon = meta.icon;
  const label =
    section.type === "cover" ? (section as any).title || "Cover" :
    section.type === "hero"  ? (section as any).headline || "Hero Banner" :
    (section as any).heading || meta.label;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      onClick={onClick}
    >
      <button className="cursor-grab shrink-0 touch-none text-muted-foreground/40 hover:text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : meta.color}`} />
      <span className="flex-1 truncate">{label}</span>
      <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-foreground" title="Duplicate">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-destructive" title="Delete">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── WYSIWYG section renderers ────────────────────────────────────────────────

function WysiwygCover({ section, clientName, date, brand, onChange }: {
  section: Extract<Section, { type: "cover" }>; clientName: string; date: string;
  brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="min-h-[360px] flex flex-col items-center justify-center text-center py-16 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.title} onChange={(v) => onChange({ ...section, title: v })}
        tag="h1" placeholder="Proposal Title" singleLine
        className="wysiwyg-edit text-4xl lg:text-5xl font-bold mb-3 leading-tight focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2"
        style={{ color: brand.primaryColor } as any}
      />
      <Editable sectionId={section.id} value={section.subtitle} onChange={(v) => onChange({ ...section, subtitle: v })}
        tag="p" placeholder="Subtitle or tagline..." singleLine
        className="wysiwyg-edit text-xl text-gray-400 mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2"
      />
      <div className="text-gray-400 text-sm space-y-1 pointer-events-none">
        <p>Prepared for <span className="font-medium text-gray-600">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function WysiwygHero({ section, brand, onChange }: {
  section: Extract<Section, { type: "hero" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden mb-0 border-b border-gray-100">
      <div className="py-20 px-10 text-center" style={{ background: section.bgColor || brand.primaryColor }}>
        <Editable sectionId={section.id} value={section.headline} onChange={(v) => onChange({ ...section, headline: v })}
          tag="h2" placeholder="Your compelling headline" singleLine
          className="wysiwyg-edit text-4xl font-bold text-white mb-4 focus:ring-2 focus:ring-white/30 focus:rounded px-1 -mx-1"
        />
        <Editable sectionId={section.id} value={section.subheadline} onChange={(v) => onChange({ ...section, subheadline: v })}
          tag="p" placeholder="Supporting text that explains your value..." singleLine
          className="wysiwyg-edit text-white/80 text-lg mb-8 max-w-xl mx-auto focus:ring-2 focus:ring-white/30 focus:rounded px-1 -mx-1"
        />
        <Editable sectionId={section.id} value={section.ctaLabel} onChange={(v) => onChange({ ...section, ctaLabel: v })}
          tag="span" placeholder="Get Started" singleLine
          className="wysiwyg-edit inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg cursor-text focus:ring-2 focus:ring-white/50"
          style={{ color: section.bgColor || brand.primaryColor } as any}
        />
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
        <span className="text-white/70 text-xs">bg</span>
        <input type="color" value={section.bgColor || brand.primaryColor}
          onChange={(e) => onChange({ ...section, bgColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" title="Background color"
        />
      </div>
    </div>
  );
}

function WysiwygText({ section, brand, onChange }: {
  section: Extract<Section, { type: "text" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Section heading" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <Editable sectionId={section.id} value={section.body} onChange={(v) => onChange({ ...section, body: v })}
        tag="p" placeholder="Write your content here..."
        className="wysiwyg-edit text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[60px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
    </div>
  );
}

function WysiwygServices({ section, brand, onChange }: {
  section: Extract<Section, { type: "services" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  function updateItem(id: string, field: keyof ServiceItem, val: string) {
    onChange({ ...section, items: section.items.map((i) => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Our Services" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.items.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors group/card">
            <div className="flex items-start gap-3">
              <input value={item.icon} onChange={(e) => updateItem(item.id, "icon", e.target.value)}
                className="text-2xl w-10 bg-transparent outline-none cursor-text" placeholder="🚀" title="Icon (emoji)" />
              <div className="flex-1 min-w-0">
                <Editable sectionId={item.id} value={item.name} onChange={(v) => updateItem(item.id, "name", v)}
                  tag="div" placeholder="Service name" singleLine
                  className="wysiwyg-edit font-semibold text-gray-900 mb-1 focus:ring-1 focus:ring-blue-200 focus:rounded" />
                <Editable sectionId={item.id} value={item.description} onChange={(v) => updateItem(item.id, "description", v)}
                  tag="div" placeholder="Brief description..." className="wysiwyg-edit text-sm text-gray-500 leading-snug focus:ring-1 focus:ring-blue-200 focus:rounded" />
              </div>
              <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })}
                className="opacity-0 group-hover/card:opacity-100 text-gray-300 hover:text-red-400 shrink-0 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: nid(), icon: "✨", name: "", description: "" }] })}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add service
        </button>
      </div>
    </div>
  );
}

function WysiwygTestimonials({ section, brand, onChange }: {
  section: Extract<Section, { type: "testimonials" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  function updateItem(id: string, field: keyof TestimonialItem, val: string) {
    onChange({ ...section, items: section.items.map((i) => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="What our clients say" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.items.map((item) => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-6 relative group/card">
            <div className="text-4xl text-gray-200 font-serif leading-none mb-3 select-none">"</div>
            <Editable sectionId={item.id} value={item.quote} onChange={(v) => updateItem(item.id, "quote", v)}
              tag="p" placeholder="Their testimonial..."
              className="wysiwyg-edit text-gray-700 mb-4 italic leading-relaxed min-h-[48px] focus:ring-1 focus:ring-blue-200 focus:rounded" />
            <div className="flex items-center gap-2 mt-auto">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: brand.accentColor }}>
                {item.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <Editable sectionId={item.id} value={item.name} onChange={(v) => updateItem(item.id, "name", v)}
                  tag="div" placeholder="Name" singleLine className="wysiwyg-edit text-sm font-semibold text-gray-900 focus:ring-1 focus:ring-blue-200 focus:rounded" />
                <Editable sectionId={item.id} value={item.role} onChange={(v) => updateItem(item.id, "role", v)}
                  tag="div" placeholder="Role, Company" singleLine className="wysiwyg-edit text-xs text-gray-400 focus:ring-1 focus:ring-blue-200 focus:rounded" />
              </div>
            </div>
            <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })}
              className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 text-gray-300 hover:text-red-400 transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: nid(), quote: "", name: "", role: "", company: "" }] })}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-400 hover:border-gray-300 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add testimonial
        </button>
      </div>
    </div>
  );
}

function WysiwygFaq({ section, brand, onChange }: {
  section: Extract<Section, { type: "faq" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  function updateItem(id: string, field: keyof FaqItem, val: string) {
    onChange({ ...section, items: section.items.map((i) => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Frequently Asked Questions" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-6 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <div className="space-y-3">
        {section.items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden group/card">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <Editable sectionId={item.id} value={item.question} onChange={(v) => updateItem(item.id, "question", v)}
                tag="div" placeholder="Question?" singleLine className="wysiwyg-edit flex-1 font-medium text-gray-900 focus:ring-1 focus:ring-blue-200 focus:rounded" />
              <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })}
                className="opacity-0 group-hover/card:opacity-100 text-gray-300 hover:text-red-400 shrink-0 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <Editable sectionId={item.id} value={item.answer} onChange={(v) => updateItem(item.id, "answer", v)}
                tag="div" placeholder="Answer..." className="wysiwyg-edit text-gray-600 text-sm leading-relaxed min-h-[36px] whitespace-pre-wrap focus:ring-1 focus:ring-blue-200 focus:rounded" />
            </div>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: nid(), question: "", answer: "" }] })}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-400 hover:border-gray-300 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>
    </div>
  );
}

function WysiwygTimeline({ section, brand, onChange }: {
  section: Extract<Section, { type: "timeline" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  function updateStep(id: string, field: keyof TimelineStep, val: string) {
    onChange({ ...section, steps: section.steps.map((s) => s.id === id ? { ...s, [field]: val } : s) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Our Process" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <div className="space-y-0">
        {section.steps.map((step, idx) => (
          <div key={step.id} className="flex gap-4 group/step">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: brand.accentColor }}>
                {idx + 1}
              </div>
              {idx < section.steps.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <Editable sectionId={step.id} value={step.title} onChange={(v) => updateStep(step.id, "title", v)}
                  tag="div" placeholder="Step title" singleLine className="wysiwyg-edit flex-1 font-semibold text-gray-900 mb-1 focus:ring-1 focus:ring-blue-200 focus:rounded" />
                <button onClick={() => onChange({ ...section, steps: section.steps.filter((s) => s.id !== step.id) })}
                  className="opacity-0 group-hover/step:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <Editable sectionId={step.id} value={step.description} onChange={(v) => updateStep(step.id, "description", v)}
                tag="div" placeholder="Describe this step..." className="wysiwyg-edit text-gray-500 text-sm leading-relaxed whitespace-pre-wrap focus:ring-1 focus:ring-blue-200 focus:rounded" />
            </div>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, steps: [...section.steps, { id: nid(), title: "", description: "" }] })}
          className="ml-12 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors py-1">
          <Plus className="h-3.5 w-3.5" /> Add step
        </button>
      </div>
    </div>
  );
}

function WysiwygCta({ section, brand, onChange }: {
  section: Extract<Section, { type: "cta" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border-b border-gray-100">
      <div className="py-16 px-10 text-center" style={{ background: section.bgColor || brand.accentColor }}>
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
          tag="h2" placeholder="Ready to get started?" singleLine
          className="wysiwyg-edit text-3xl font-bold text-white mb-3 focus:ring-2 focus:ring-white/30 focus:rounded px-1 -mx-1"
        />
        <Editable sectionId={section.id} value={section.subtext} onChange={(v) => onChange({ ...section, subtext: v })}
          tag="p" placeholder="Supporting text..." singleLine
          className="wysiwyg-edit text-white/80 mb-8 focus:ring-2 focus:ring-white/30 focus:rounded px-1 -mx-1"
        />
        <Editable sectionId={section.id} value={section.buttonLabel} onChange={(v) => onChange({ ...section, buttonLabel: v })}
          tag="span" placeholder="Get in touch" singleLine
          className="wysiwyg-edit inline-block bg-white font-semibold text-sm px-6 py-3 rounded-lg cursor-text focus:ring-2 focus:ring-white/50"
          style={{ color: section.bgColor || brand.accentColor } as any}
        />
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
        <span className="text-white/70 text-xs">bg</span>
        <input type="color" value={section.bgColor || brand.accentColor}
          onChange={(e) => onChange({ ...section, bgColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
      </div>
    </div>
  );
}

function WysiwygPricing({ section, currency, brand, onChange }: {
  section: Extract<Section, { type: "pricing" }>; currency: string; brand: Brand; onChange: (s: Section) => void;
}) {
  function updateRow(id: string, field: keyof PricingRow, val: string | number) {
    onChange({ ...section, rows: section.rows.map((r) => r.id === id ? { ...r, [field]: val } : r) });
  }
  const total = section.rows.reduce((s, r) => s + r.qty * r.unitPrice, 0);
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Investment" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-6 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {["Service","Description","Qty","Unit Price","Total",""].map((h, i) => (
              <th key={i} className={`py-3 pr-4 font-semibold text-gray-700 ${i >= 2 ? "text-right" : "text-left"} ${i === 5 ? "w-8 pr-0" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 group/row">
              <td className="py-2 pr-4">
                <input value={row.service} onChange={(e) => updateRow(row.id, "service", e.target.value)}
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 font-medium text-gray-900 placeholder:text-gray-300" placeholder="Service" />
              </td>
              <td className="py-2 pr-4">
                <input value={row.description} onChange={(e) => updateRow(row.id, "description", e.target.value)}
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 text-gray-500 placeholder:text-gray-300" placeholder="Description" />
              </td>
              <td className="py-2 pr-4">
                <input type="number" min="0" value={row.qty} onChange={(e) => updateRow(row.id, "qty", parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700" />
              </td>
              <td className="py-2 pr-4">
                <input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateRow(row.id, "unitPrice", parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700" />
              </td>
              <td className="py-2 text-right text-gray-900 font-medium pr-4">{fmt(row.qty * row.unitPrice, currency)}</td>
              <td className="py-2 pl-1">
                <button onClick={() => onChange({ ...section, rows: section.rows.filter((r) => r.id !== row.id) })}
                  className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                  <X className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">Grand Total</td>
            <td className="py-3 text-right font-bold text-gray-900 text-lg">{fmt(total, currency)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <button onClick={() => onChange({ ...section, rows: [...section.rows, { id: nid(), service: "", description: "", qty: 1, unitPrice: 0 }] })}
        className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add row
      </button>
    </div>
  );
}

function WysiwygTerms({ section, brand, onChange }: {
  section: Extract<Section, { type: "terms" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Terms & Conditions" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <Editable sectionId={section.id} value={section.body} onChange={(v) => onChange({ ...section, body: v })}
        tag="div" placeholder="Write your terms here..."
        className="wysiwyg-edit text-xs text-gray-500 leading-relaxed whitespace-pre-wrap min-h-[100px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
    </div>
  );
}

function WysiwygSignature({ section, brand, onChange }: {
  section: Extract<Section, { type: "signature" }>; brand: Brand; onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2" placeholder="Accept This Proposal" singleLine
        className="wysiwyg-edit text-2xl font-bold mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
        style={{ color: brand.primaryColor } as any}
      />
      <Editable sectionId={section.id} value={section.message} onChange={(v) => onChange({ ...section, message: v })}
        tag="p" placeholder="By typing your full name below, you agree to the terms..."
        className="wysiwyg-edit text-gray-500 mb-8 whitespace-pre-wrap focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <div className="pointer-events-none opacity-50 flex gap-4">
        <div className="flex-1 text-white text-center font-semibold py-3 px-6 rounded-lg text-sm"
          style={{ background: brand.accentColor }}>Accept Proposal</div>
        <div className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg text-sm">Decline</div>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center pointer-events-none">Client accept / decline buttons shown here</p>
    </div>
  );
}

// ─── Section factory ──────────────────────────────────────────────────────────

function makeSection(type: Section["type"]): Section {
  const id = nid();
  switch (type) {
    case "cover":        return { id, type: "cover", title: "Proposal Title", subtitle: "" };
    case "hero":         return { id, type: "hero", headline: "Your Compelling Headline", subheadline: "Supporting text that builds trust and explains your value proposition.", ctaLabel: "Get Started", bgColor: "#0f172a" };
    case "text":         return { id, type: "text", heading: "New Section", body: "" };
    case "pricing":      return { id, type: "pricing", heading: "Investment", rows: [] };
    case "services":     return { id, type: "services", heading: "What We Offer", items: [{ id: nid(), icon: "🚀", name: "Service One", description: "Description of this service." }, { id: nid(), icon: "💡", name: "Service Two", description: "Description of this service." }] };
    case "testimonials": return { id, type: "testimonials", heading: "What Our Clients Say", items: [{ id: nid(), quote: "Working with this team has been an exceptional experience.", name: "Jane Smith", role: "CEO", company: "Acme Inc" }] };
    case "faq":          return { id, type: "faq", heading: "Frequently Asked Questions", items: [{ id: nid(), question: "How long does it take?", answer: "Typically 2–4 weeks depending on scope." }] };
    case "timeline":     return { id, type: "timeline", heading: "Our Process", steps: [{ id: nid(), title: "Discovery", description: "We start with a deep-dive into your goals and requirements." }, { id: nid(), title: "Strategy", description: "We build a tailored roadmap for success." }, { id: nid(), title: "Delivery", description: "We execute with precision and keep you informed at every step." }] };
    case "cta":          return { id, type: "cta", heading: "Ready to Get Started?", subtext: "Let's build something great together.", buttonLabel: "Accept Proposal", bgColor: "#2dd4bf" };
    case "terms":        return { id, type: "terms", heading: "Terms & Conditions", body: "" };
    case "signature":    return { id, type: "signature", heading: "Accept This Proposal", message: "By typing your full name below, you agree to the terms outlined in this proposal." };
  }
}

// ─── Brand panel ──────────────────────────────────────────────────────────────

function BrandPanel({ brand, onChange }: { brand: Brand; onChange: (b: Brand) => void }) {
  return (
    <div className="p-4 space-y-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Colors</label>
        <div className="space-y-3">
          {([["primaryColor", "Primary"], ["accentColor", "Accent"]] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <input type="color" value={brand[key]}
                onChange={(e) => onChange({ ...brand, [key]: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border border-border shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <input value={brand[key]}
                  onChange={(e) => onChange({ ...brand, [key]: e.target.value })}
                  className="w-full text-xs font-mono bg-transparent border-b border-border outline-none focus:border-primary text-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Typography</label>
        <select value={brand.font} onChange={(e) => onChange({ ...brand, font: e.target.value })}
          className="w-full text-sm bg-background border border-border rounded-md px-3 py-1.5 text-foreground">
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Logo URL</label>
        <input value={brand.logoUrl} onChange={(e) => onChange({ ...brand, logoUrl: e.target.value })}
          placeholder="https://..."
          className="w-full text-sm bg-background border border-border rounded-md px-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
        {brand.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt="logo preview" className="mt-2 h-8 object-contain rounded" />
        )}
      </div>
      <div className="pt-1 border-t border-border">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Preview</label>
        <div className="rounded-lg p-4 space-y-1.5" style={{ fontFamily: brand.font }}>
          <div className="text-sm font-bold" style={{ color: brand.primaryColor }}>Heading text</div>
          <div className="text-xs text-gray-500">Body text looks like this</div>
          <div className="inline-block text-xs text-white px-3 py-1 rounded-full" style={{ background: brand.accentColor }}>Accent</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SidebarTab = "sections" | "brand";
type PreviewMode = "desktop" | "mobile";

const ADD_SECTIONS: Array<[Section["type"], string]> = [
  ["cover", "Cover"], ["hero", "Hero Banner"], ["text", "Text Block"],
  ["services", "Services"], ["testimonials", "Testimonials"], ["faq", "FAQ"],
  ["timeline", "Timeline"], ["pricing", "Pricing Table"], ["cta", "Call to Action"],
  ["terms", "Terms"], ["signature", "Signature"],
];

export default function ProposalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [status, setStatus] = useState("DRAFT");
  const [currency, setCurrency] = useState("USD");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("sections");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProposal(data);
        setTitle(data.title);
        setStatus(data.status);
        setCurrency(data.currency);
        setSections(data.sections as Section[]);
        setBrand({ ...DEFAULT_BRAND, ...(data.brand ?? {}) });
        if ((data.sections as Section[]).length > 0) {
          setSelectedId((data.sections as Section[])[0].id);
        }
        setLoading(false);
      });
  }, [id]);

  const scheduleSave = useCallback(
    (newSections: Section[], newTitle: string, newBrand: Brand) => {
      setSaveState("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveState("saving");
        await fetch(`/api/proposals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle,
            sections: newSections,
            totalAmount: computeTotal(newSections),
            brand: newBrand,
          }),
        });
        setSaveState("saved");
      }, 1500);
    },
    [id]
  );

  function updateSection(updated: Section) {
    const next = sections.map((s) => (s.id === updated.id ? updated : s));
    setSections(next);
    scheduleSave(next, title, brand);
  }

  function updateBrand(b: Brand) {
    setBrand(b);
    scheduleSave(sections, title, b);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = sections.findIndex((s) => s.id === active.id);
      const newIdx = sections.findIndex((s) => s.id === over.id);
      const next = arrayMove(sections, oldIdx, newIdx);
      setSections(next);
      scheduleSave(next, title, brand);
    }
  }

  function duplicateSection(sectionId: string) {
    const src = sections.find((s) => s.id === sectionId);
    if (!src) return;
    const copy = { ...JSON.parse(JSON.stringify(src)), id: nid() };
    const idx = sections.findIndex((s) => s.id === sectionId);
    const next = [...sections.slice(0, idx + 1), copy, ...sections.slice(idx + 1)];
    setSections(next);
    setSelectedId(copy.id);
    scheduleSave(next, title, brand);
  }

  function deleteSection(sectionId: string) {
    const next = sections.filter((s) => s.id !== sectionId);
    setSections(next);
    if (selectedId === sectionId) setSelectedId(next[0]?.id ?? null);
    scheduleSave(next, title, brand);
  }

  function addSection(type: Section["type"]) {
    const section = makeSection(type);
    const next = [...sections, section];
    setSections(next);
    setSelectedId(section.id);
    setAddMenuOpen(false);
    scheduleSave(next, title, brand);
    setTimeout(() => sectionRefs.current[section.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function scrollTo(sectionId: string) {
    setSelectedId(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSend() {
    if (!confirm("Send this proposal to the client?")) return;
    setSending(true);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sections, totalAmount: computeTotal(sections), brand }),
      });
    }
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send" }),
    });
    setStatus("SENT");
    setSending(false);
    setSaveState("saved");
  }

  const clientName = proposal?.user.companyName || proposal?.user.name || "Client";
  const proposalDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const renderSection = (section: Section) => {
    const props = { section: section as any, brand, onChange: updateSection };
    switch (section.type) {
      case "cover":        return <WysiwygCover {...props} clientName={clientName} date={proposalDate} />;
      case "hero":         return <WysiwygHero {...props} />;
      case "text":         return <WysiwygText {...props} />;
      case "pricing":      return <WysiwygPricing {...props} currency={currency} />;
      case "services":     return <WysiwygServices {...props} />;
      case "testimonials": return <WysiwygTestimonials {...props} />;
      case "faq":          return <WysiwygFaq {...props} />;
      case "timeline":     return <WysiwygTimeline {...props} />;
      case "cta":          return <WysiwygCta {...props} />;
      case "terms":        return <WysiwygTerms {...props} />;
      case "signature":    return <WysiwygSignature {...props} />;
      default:             return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Placeholder styles for contenteditable */}
      <style>{`
        .wysiwyg-edit[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
        }
      `}</style>

      <div className="flex flex-col h-screen" style={{ fontFamily: brand.font }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-card shrink-0">
          {editingTitle ? (
            <input ref={titleRef}
              className="text-base font-semibold bg-transparent border-b border-primary outline-none text-foreground min-w-0 flex-1 max-w-xs"
              value={title} onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setEditingTitle(false); scheduleSave(sections, title, brand); }}
              onKeyDown={(e) => e.key === "Enter" && titleRef.current?.blur()}
              autoFocus
            />
          ) : (
            <button className="text-base font-semibold text-foreground hover:text-primary transition-colors truncate max-w-xs"
              onClick={() => setEditingTitle(true)} title="Click to rename">
              {title || "Untitled Proposal"}
            </button>
          )}

          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status] || STATUS_BADGE.DRAFT}`}>
            {status}
          </span>

          <div className="flex-1" />

          {/* Preview mode toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setPreviewMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${previewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={mode === "desktop" ? "Desktop preview" : "Mobile preview"}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
            {saveState === "saved"  && <><Check className="h-3 w-3 text-green-500" /> Saved</>}
            {saveState === "unsaved" && "Unsaved..."}
          </span>

          <Button variant="outline" size="sm" onClick={() => window.open(`/admin/proposals/${id}/preview`, "_blank")}>
            <Eye className="h-4 w-4 mr-1.5" /> Preview
          </Button>

          <Button size="sm" onClick={handleSend} disabled={sending || status !== "DRAFT"}
            className={status !== "DRAFT" ? "opacity-50" : ""}>
            {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            {status === "DRAFT" ? "Send to Client" : "Sent"}
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-60 border-r border-border bg-card flex flex-col shrink-0">
            {/* Tab switcher */}
            <div className="flex border-b border-border shrink-0">
              {([["sections", "Sections"], ["brand", "Brand"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setSidebarTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sidebarTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "brand" && <Palette className="h-3 w-3 inline-block mr-1 -mt-0.5" />}
                  {label}
                </button>
              ))}
            </div>

            {sidebarTab === "sections" ? (
              <>
                <div className="flex-1 overflow-y-auto p-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((s) => (
                        <SortableItem key={s.id} section={s} isActive={s.id === selectedId}
                          onClick={() => scrollTo(s.id)}
                          onDuplicate={() => duplicateSection(s.id)}
                          onDelete={() => deleteSection(s.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  {sections.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No sections yet. Add one below.</p>
                  )}
                </div>

                {/* Add section */}
                <div className="p-2 border-t border-border relative">
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setAddMenuOpen((v) => !v)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Section
                  </Button>
                  {addMenuOpen && (
                    <div className="absolute bottom-full left-2 right-2 mb-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-20">
                      <div className="p-1.5 grid grid-cols-1 gap-0">
                        {ADD_SECTIONS.map(([type, label]) => {
                          const meta = SECTION_META[type];
                          const Icon = meta.icon;
                          return (
                            <button key={type} onClick={() => addSection(type)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors text-left">
                              <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <BrandPanel brand={brand} onChange={updateBrand} />
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto bg-[#f1f5f9]">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Start building your proposal</h3>
                <p className="text-gray-400 mt-1 text-sm">Add sections from the sidebar on the left.</p>
              </div>
            ) : (
              <div className="py-8 px-4">
                <div
                  className="bg-white mx-auto rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300"
                  style={{
                    maxWidth: previewMode === "mobile" ? "390px" : "900px",
                    fontFamily: brand.font,
                  }}
                >
                  {/* Brand header bar */}
                  {(brand.logoUrl || true) && (
                    <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100"
                      style={{ background: brand.primaryColor }}>
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logoUrl} alt="logo" className="h-7 object-contain" />
                      ) : (
                        <span className="text-white/80 text-sm font-semibold tracking-wide">YOUR LOGO</span>
                      )}
                      <span className="text-white/50 text-xs">Proposal</span>
                    </div>
                  )}

                  {/* Editing hint */}
                  <div className="flex items-center gap-2 px-6 py-1.5 bg-blue-50 border-b border-blue-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <p className="text-xs text-blue-500">Click any text to edit · Drag sections to reorder · Changes save automatically</p>
                  </div>

                  {/* Sections */}
                  <div className="px-10 py-1">
                    {sections.map((section) => (
                      <div key={section.id}
                        ref={(el) => { sectionRefs.current[section.id] = el; }}
                        onClick={() => setSelectedId(section.id)}
                        className={`relative transition-all rounded-sm ${selectedId === section.id ? "ring-2 ring-blue-300 ring-offset-2" : ""}`}
                      >
                        {renderSection(section)}
                        {/* Hover toolbar */}
                        {selectedId === section.id && (
                          <div className="absolute -top-3 right-0 flex items-center gap-1 bg-blue-600 rounded-full px-2 py-0.5 shadow-md z-10">
                            <button onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }}
                              className="text-white/80 hover:text-white p-0.5" title="Duplicate">
                              <Copy className="h-3 w-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                              className="text-white/80 hover:text-white p-0.5" title="Delete">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
