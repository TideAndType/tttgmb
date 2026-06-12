"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText, Type, Table, ScrollText, PenLine, Plus, X, Eye, Send,
  Check, Loader2, GripVertical, Copy, Trash2, Monitor, Smartphone,
  Layout, Palette, Star, MessageSquare, HelpCircle, Megaphone, GitBranch,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LayoutSection, Selection, makeLayoutSection, Block, Column, uid } from "./layout-types";
import { LayoutSectionEditor } from "./layout-section";
import { PropertiesBar } from "./properties-bar";

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
  | { id: string; type: "hero"; headline: string; subheadline: string; ctaLabel: string; ctaUrl: string; bgColor: string; bgVideo?: string }
  | { id: string; type: "services"; heading: string; items: ServiceItem[] }
  | { id: string; type: "testimonials"; heading: string; items: TestimonialItem[] }
  | { id: string; type: "faq"; heading: string; items: FaqItem[] }
  | { id: string; type: "cta"; heading: string; subtext: string; buttonLabel: string; buttonUrl: string; bgColor: string; bgVideo?: string }
  | { id: string; type: "timeline"; heading: string; steps: TimelineStep[] }
  | LayoutSection;

type Brand = { primaryColor: string; accentColor: string; font: string; logoUrl: string };

type Proposal = {
  id: string; title: string; status: string; currency: string; validUntil: string | null;
  sections: Section[]; totalAmount: number | null; notes: string | null; brand: Brand | null;
  user: { id: string; name: string; companyName: string | null };
};

const DEFAULT_BRAND: Brand = { primaryColor: "#2563eb", accentColor: "#7c3aed", font: "Inter", logoUrl: "" };

function newId() { return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function computeTotal(sections: Section[]): number {
  let total = 0;
  for (const s of sections) {
    if (s.type === "pricing") for (const row of s.rows) total += row.qty * row.unitPrice;
  }
  return total;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  cover: FileText, text: Type, pricing: Table, terms: ScrollText, signature: PenLine,
  hero: Layout, services: Star, testimonials: MessageSquare, faq: HelpCircle, cta: Megaphone, timeline: GitBranch, layout: Layout,
};

const SECTION_LABELS: Record<string, string> = {
  cover: "Cover", text: "Text Block", pricing: "Pricing Table", terms: "Terms & Conditions", signature: "Signature",
  hero: "Hero Banner", services: "Services", testimonials: "Testimonials", faq: "FAQ", cta: "Call to Action", timeline: "Timeline", layout: "Layout Block",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200", SENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWED: "bg-amber-100 text-amber-700 border-amber-200", ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
};

const FONT_OPTIONS = ["Inter", "Georgia", "Merriweather", "Montserrat", "Playfair Display"];

function Editable({ sectionId, value, onChange, tag = "div", className = "", placeholder = "", singleLine = false }: {
  sectionId: string; value: string; onChange: (v: string) => void;
  tag?: "div" | "h1" | "h2" | "p" | "span"; className?: string; placeholder?: string; singleLine?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const isComposing = useRef(false);
  useEffect(() => { if (ref.current) ref.current.innerText = value ?? ""; }, [sectionId]); // eslint-disable-line
  const Tag = tag as any;
  return (
    <Tag ref={ref} contentEditable suppressContentEditableWarning
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={(e: any) => { isComposing.current = false; onChange(e.currentTarget.innerText); }}
      onInput={(e: any) => { if (!isComposing.current) onChange(e.currentTarget.innerText); }}
      onKeyDown={(e: any) => { if (singleLine && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      className={`outline-none cursor-text ${className}`} data-placeholder={placeholder}
    />
  );
}

function SectionHoverToolbar({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900 text-white rounded-md px-1.5 py-1 shadow-lg z-20 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
      <button onClick={onDuplicate} className="p-1 hover:text-blue-300" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="p-1 hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function SortableSidebarItem({ section, idx, total, isActive, onSelect, onDuplicate, onDelete }: {
  section: Section; idx: number; total: number; isActive: boolean;
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = SECTION_ICONS[section.type] ?? FileText;
  const label = section.type === "cover" ? (section as any).title || "Cover" : (section as any).heading || SECTION_LABELS[section.type];
  return (
    <div ref={setNodeRef} style={style}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      onClick={onSelect}>
      <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-sm truncate">{label}</span>
      <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-blue-500" title="Duplicate"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function WysiwygCover({ section, clientName, date, onChange }: {
  section: Extract<Section, { type: "cover" }>; clientName: string; date: string; onChange: (s: Section) => void;
}) {
  return (
    <div className="min-h-[360px] flex flex-col items-center justify-center text-center py-16 border-b border-gray-100">
      <style>{`.wysiwyg-editable[data-placeholder]:empty:before{content:attr(data-placeholder);color:#d1d5db;pointer-events:none}`}</style>
      <Editable sectionId={section.id} value={section.title} onChange={(v) => onChange({ ...section, title: v })} tag="h1" placeholder="Proposal Title" singleLine className="wysiwyg-editable text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight min-w-[200px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2" />
      <Editable sectionId={section.id} value={section.subtitle} onChange={(v) => onChange({ ...section, subtitle: v })} tag="p" placeholder="Subtitle or tagline..." singleLine className="wysiwyg-editable text-xl text-gray-400 mb-8 min-w-[160px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2" />
      <div className="text-gray-400 text-sm space-y-1 pointer-events-none">
        <p>Prepared for <span className="font-medium text-gray-600">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function WysiwygText({ section, onChange }: { section: Extract<Section, { type: "text" }>; onChange: (s: Section) => void }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Section heading" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <Editable sectionId={section.id} value={section.body} onChange={(v) => onChange({ ...section, body: v })} tag="p" placeholder="Write your content here..." className="wysiwyg-editable text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[80px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
    </div>
  );
}

function WysiwygPricing({ section, currency, onChange }: { section: Extract<Section, { type: "pricing" }>; currency: string; onChange: (s: Section) => void }) {
  function updateRow(rowId: string, field: keyof PricingRow, value: string | number) {
    onChange({ ...section, rows: section.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)) });
  }
  const grandTotal = section.rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0);
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Investment" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-6 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <table className="w-full border-collapse text-sm mb-4">
        <thead><tr className="border-b-2 border-gray-200">
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Service</th>
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Description</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700 w-16">Qty</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700 w-28">Unit Price</th>
          <th className="text-right py-3 font-semibold text-gray-700 w-24">Total</th>
          <th className="w-8"></th>
        </tr></thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 group/row">
              <td className="py-2 pr-4"><input className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 font-medium text-gray-900 placeholder:text-gray-300" value={row.service} onChange={(e) => updateRow(row.id, "service", e.target.value)} placeholder="Service name" /></td>
              <td className="py-2 pr-4"><input className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 text-gray-500 placeholder:text-gray-300" value={row.description} onChange={(e) => updateRow(row.id, "description", e.target.value)} placeholder="Description" /></td>
              <td className="py-2 pr-4 text-right"><input className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700" type="number" min="0" value={row.qty} onChange={(e) => updateRow(row.id, "qty", parseFloat(e.target.value) || 0)} /></td>
              <td className="py-2 pr-4 text-right"><input className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700" type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateRow(row.id, "unitPrice", parseFloat(e.target.value) || 0)} /></td>
              <td className="py-2 text-right text-gray-900 font-medium">{fmt(row.qty * row.unitPrice, currency)}</td>
              <td className="py-2 pl-2"><button onClick={() => onChange({ ...section, rows: section.rows.filter((r) => r.id !== row.id) })} className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="border-t-2 border-gray-900">
          <td colSpan={4} className="py-3 pr-4 text-right font-bold text-gray-900">Grand Total</td>
          <td className="py-3 text-right font-bold text-gray-900 text-lg">{fmt(grandTotal, currency)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <button onClick={() => onChange({ ...section, rows: [...section.rows, { id: newId(), service: "", description: "", qty: 1, unitPrice: 0 }] })} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"><Plus className="h-3.5 w-3.5" /> Add row</button>
    </div>
  );
}

function WysiwygTerms({ section, onChange }: { section: Extract<Section, { type: "terms" }>; onChange: (s: Section) => void }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Terms & Conditions" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <Editable sectionId={section.id} value={section.body} onChange={(v) => onChange({ ...section, body: v })} tag="div" placeholder="Write your terms here..." className="wysiwyg-editable text-xs text-gray-500 leading-relaxed whitespace-pre-wrap min-h-[120px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
    </div>
  );
}

function WysiwygSignature({ section, onChange }: { section: Extract<Section, { type: "signature" }>; onChange: (s: Section) => void }) {
  return (
    <div className="py-10">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Accept This Proposal" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <Editable sectionId={section.id} value={section.message} onChange={(v) => onChange({ ...section, message: v })} tag="p" placeholder="By typing your full name below, you agree to the terms outlined in this proposal." className="wysiwyg-editable text-gray-500 mb-8 whitespace-pre-wrap focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <div className="pointer-events-none opacity-50">
        <div className="flex gap-4">
          <div className="flex-1 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-center text-sm">Accept Proposal</div>
          <div className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg text-sm">Decline</div>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Client will see the accept / decline buttons here</p>
      </div>
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

function EditorVideoBackground({ url }: { url: string }) {
  const embed = getEmbedUrl(url);
  if (!embed) return null;
  return (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none rounded-sm">
      <iframe src={embed} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full border-0" allow="autoplay; fullscreen" />
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}

function WysiwygHero({ section, onChange }: { section: Extract<Section, { type: "hero" }>; onChange: (s: Section) => void }) {
  const hasVideo = !!section.bgVideo;
  return (
    <div className="relative border-b border-gray-100 overflow-hidden" style={hasVideo ? {} : { backgroundColor: section.bgColor }}>
      {hasVideo && <EditorVideoBackground url={section.bgVideo!} />}
      <div className="relative z-10 py-20 px-8 text-center">
        <div className="flex items-center justify-end mb-4 gap-2 flex-wrap">
          {!hasVideo && (
            <>
              <label className="text-white/70 text-xs">Color:</label>
              <input type="color" value={section.bgColor} onChange={(e) => onChange({ ...section, bgColor: e.target.value })} className="h-6 w-10 rounded border-0 cursor-pointer bg-transparent" />
            </>
          )}
          <label className="text-white/70 text-xs">Video URL:</label>
          <input value={section.bgVideo || ""} onChange={(e) => onChange({ ...section, bgVideo: e.target.value || undefined })} placeholder="YouTube or Vimeo URL..." className="text-xs rounded px-2 py-1 bg-white/20 text-white placeholder:text-white/40 border border-white/30 w-52 outline-none focus:bg-white/30" />
        </div>
        <Editable sectionId={section.id} value={section.headline} onChange={(v) => onChange({ ...section, headline: v })} tag="h1" placeholder="Your compelling headline" singleLine className="wysiwyg-editable text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight min-w-[200px] focus:ring-2 focus:ring-white/30 focus:rounded px-2 -mx-2" />
        <Editable sectionId={section.id} value={section.subheadline} onChange={(v) => onChange({ ...section, subheadline: v })} tag="p" placeholder="Supporting subheadline..." singleLine className="wysiwyg-editable text-xl text-white/80 mb-10 min-w-[160px] focus:ring-2 focus:ring-white/30 focus:rounded px-2 -mx-2" />
        <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-1 py-1">
          <Editable sectionId={section.id} value={section.ctaLabel} onChange={(v) => onChange({ ...section, ctaLabel: v })} tag="span" placeholder="Get Started" singleLine className="wysiwyg-editable font-semibold text-white px-5 py-2 focus:ring-2 focus:ring-white/40 focus:rounded" />
        </div>
      </div>
    </div>
  );
}

function WysiwygServices({ section, onChange }: { section: Extract<Section, { type: "services" }>; onChange: (s: Section) => void }) {
  function updateItem(itemId: string, field: keyof ServiceItem, value: string) {
    onChange({ ...section, items: section.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Our Services" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-8 text-center focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <div className="grid grid-cols-2 gap-4">
        {section.items.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50 group/item relative">
            <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })} className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X className="h-3.5 w-3.5" /></button>
            <input value={item.icon} onChange={(e) => updateItem(item.id, "icon", e.target.value)} className="text-2xl mb-3 block w-12 bg-transparent outline-none border border-transparent focus:border-blue-200 rounded text-center" placeholder="🚀" />
            <input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} className="font-semibold text-gray-900 mb-2 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300" placeholder="Service name" />
            <input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="text-sm text-gray-500 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300" placeholder="Brief description..." />
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: newId(), icon: "⭐", name: "", description: "" }] })} className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add service</button>
      </div>
    </div>
  );
}

function WysiwygTestimonials({ section, onChange }: { section: Extract<Section, { type: "testimonials" }>; onChange: (s: Section) => void }) {
  function updateItem(itemId: string, field: keyof TestimonialItem, value: string) {
    onChange({ ...section, items: section.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="What clients say" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-8 text-center focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <div className="grid grid-cols-2 gap-4">
        {section.items.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm group/item relative">
            <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })} className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X className="h-3.5 w-3.5" /></button>
            <p className="text-4xl text-gray-200 font-serif mb-2">&ldquo;</p>
            <textarea value={item.quote} onChange={(e) => updateItem(item.id, "quote", e.target.value)} rows={3} className="text-gray-700 italic w-full bg-transparent outline-none resize-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 text-sm" placeholder="Client quote..." />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} className="font-semibold text-gray-900 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 text-sm" placeholder="Client name" />
              <input value={item.role} onChange={(e) => updateItem(item.id, "role", e.target.value)} className="text-gray-500 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 text-xs mt-0.5" placeholder="Role" />
              <input value={item.company} onChange={(e) => updateItem(item.id, "company", e.target.value)} className="text-gray-400 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 text-xs" placeholder="Company" />
            </div>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: newId(), quote: "", name: "", role: "", company: "" }] })} className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add testimonial</button>
      </div>
    </div>
  );
}

function WysiwygFaq({ section, onChange }: { section: Extract<Section, { type: "faq" }>; onChange: (s: Section) => void }) {
  function updateItem(itemId: string, field: keyof FaqItem, value: string) {
    onChange({ ...section, items: section.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Frequently Asked Questions" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <div className="space-y-4">
        {section.items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4 group/item relative">
            <button onClick={() => onChange({ ...section, items: section.items.filter((i) => i.id !== item.id) })} className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X className="h-3.5 w-3.5" /></button>
            <input value={item.question} onChange={(e) => updateItem(item.id, "question", e.target.value)} className="font-semibold text-gray-900 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 mb-2" placeholder="Question?" />
            <textarea value={item.answer} onChange={(e) => updateItem(item.id, "answer", e.target.value)} rows={2} className="text-gray-600 text-sm w-full bg-transparent outline-none resize-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300" placeholder="Answer..." />
          </div>
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: newId(), question: "", answer: "" }] })} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"><Plus className="h-3.5 w-3.5" /> Add question</button>
      </div>
    </div>
  );
}

function WysiwygCta({ section, onChange }: { section: Extract<Section, { type: "cta" }>; onChange: (s: Section) => void }) {
  const hasVideo = !!section.bgVideo;
  return (
    <div className="relative border-b border-gray-100 overflow-hidden" style={hasVideo ? {} : { backgroundColor: section.bgColor }}>
      {hasVideo && <EditorVideoBackground url={section.bgVideo!} />}
      <div className="relative z-10 py-16 px-8 text-center">
        <div className="flex items-center justify-end mb-4 gap-2 flex-wrap">
          {!hasVideo && (
            <>
              <label className="text-white/70 text-xs">Color:</label>
              <input type="color" value={section.bgColor} onChange={(e) => onChange({ ...section, bgColor: e.target.value })} className="h-6 w-10 rounded border-0 cursor-pointer bg-transparent" />
            </>
          )}
          <label className="text-white/70 text-xs">Video URL:</label>
          <input value={section.bgVideo || ""} onChange={(e) => onChange({ ...section, bgVideo: e.target.value || undefined })} placeholder="YouTube or Vimeo URL..." className="text-xs rounded px-2 py-1 bg-white/20 text-white placeholder:text-white/40 border border-white/30 w-52 outline-none focus:bg-white/30" />
        </div>
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Ready to get started?" singleLine className="wysiwyg-editable text-3xl font-bold text-white mb-3 focus:ring-2 focus:ring-white/30 focus:rounded px-2 -mx-2" />
        <Editable sectionId={section.id} value={section.subtext} onChange={(v) => onChange({ ...section, subtext: v })} tag="p" placeholder="Supporting text..." singleLine className="wysiwyg-editable text-white/80 mb-8 focus:ring-2 focus:ring-white/30 focus:rounded px-2 -mx-2" />
        <div className="inline-block bg-white rounded-lg px-8 py-3 font-semibold text-gray-900 shadow">
          <Editable sectionId={section.id} value={section.buttonLabel} onChange={(v) => onChange({ ...section, buttonLabel: v })} tag="span" placeholder="Get Started" singleLine className="wysiwyg-editable focus:ring-2 focus:ring-blue-200 focus:rounded" />
        </div>
      </div>
    </div>
  );
}

function WysiwygTimeline({ section, onChange }: { section: Extract<Section, { type: "timeline" }>; onChange: (s: Section) => void }) {
  function updateStep(stepId: string, field: keyof TimelineStep, value: string) {
    onChange({ ...section, steps: section.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Our Process" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-8 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
      <div className="space-y-6">
        {section.steps.map((step, idx) => (
          <div key={step.id} className="flex gap-4 group/step relative">
            <div className="shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{idx + 1}</div>
            <div className="flex-1">
              <input value={step.title} onChange={(e) => updateStep(step.id, "title", e.target.value)} className="font-semibold text-gray-900 block w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300 mb-1" placeholder="Step title" />
              <textarea value={step.description} onChange={(e) => updateStep(step.id, "description", e.target.value)} rows={2} className="text-gray-600 text-sm w-full bg-transparent outline-none resize-none focus:bg-blue-50 focus:rounded px-1 -mx-1 placeholder:text-gray-300" placeholder="Step description..." />
            </div>
            <button onClick={() => onChange({ ...section, steps: section.steps.filter((s) => s.id !== step.id) })} className="opacity-0 group-hover/step:opacity-100 text-gray-300 hover:text-red-400 transition-all self-start mt-1"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onChange({ ...section, steps: [...section.steps, { id: newId(), title: "", description: "" }] })} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"><Plus className="h-3.5 w-3.5" /> Add step</button>
      </div>
    </div>
  );
}

function BrandPanel({ brand, onChange }: { brand: Brand; onChange: (b: Brand) => void }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Primary Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={brand.primaryColor} onChange={(e) => onChange({ ...brand, primaryColor: e.target.value })} className="h-8 w-12 rounded border border-border cursor-pointer" />
          <input type="text" value={brand.primaryColor} onChange={(e) => onChange({ ...brand, primaryColor: e.target.value })} className="flex-1 text-sm border border-border rounded px-2 py-1.5 font-mono bg-background" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Accent Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={brand.accentColor} onChange={(e) => onChange({ ...brand, accentColor: e.target.value })} className="h-8 w-12 rounded border border-border cursor-pointer" />
          <input type="text" value={brand.accentColor} onChange={(e) => onChange({ ...brand, accentColor: e.target.value })} className="flex-1 text-sm border border-border rounded px-2 py-1.5 font-mono bg-background" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Font Family</label>
        <select value={brand.font} onChange={(e) => onChange({ ...brand, font: e.target.value })} className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background">
          {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Logo URL</label>
        <input type="text" value={brand.logoUrl} onChange={(e) => onChange({ ...brand, logoUrl: e.target.value })} placeholder="https://..." className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background" />
        {brand.logoUrl && <img src={brand.logoUrl} alt="Logo preview" className="mt-2 h-8 object-contain" />}
      </div>
    </div>
  );
}

export default function ProposalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [status, setStatus] = useState("DRAFT");
  const [currency, setCurrency] = useState("USD");
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutSelection, setLayoutSelection] = useState<Selection | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"sections" | "brand">("sections");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    fetch(`/api/proposals/${id}`).then((r) => r.json()).then((data) => {
      setProposal(data); setTitle(data.title); setStatus(data.status); setCurrency(data.currency);
      setSections(data.sections as Section[]); setBrand(data.brand ? (data.brand as Brand) : DEFAULT_BRAND);
      if ((data.sections as Section[]).length > 0) setSelectedId((data.sections as Section[])[0].id);
      setLoading(false);
    });
  }, [id]);

  const scheduleSave = useCallback((newSections: Section[], newTitle: string, newBrand: Brand) => {
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle, sections: newSections, totalAmount: computeTotal(newSections), brand: newBrand }) });
      setSaveState("saved");
    }, 1500);
  }, [id]);

  function updateSection(updated: Section) { const ns = sections.map((s) => (s.id === updated.id ? updated : s)); setSections(ns); scheduleSave(ns, title, brand); }
  function deleteSection(sectionId: string) { const ns = sections.filter((s) => s.id !== sectionId); setSections(ns); if (selectedId === sectionId) setSelectedId(ns[0]?.id ?? null); scheduleSave(ns, title, brand); }
  function duplicateSection(sectionId: string) {
    const idx = sections.findIndex((s) => s.id === sectionId); if (idx === -1) return;
    const dup: Section = { ...JSON.parse(JSON.stringify(sections[idx])), id: newId() };
    const ns = [...sections.slice(0, idx + 1), dup, ...sections.slice(idx + 1)];
    setSections(ns); setSelectedId(dup.id); scheduleSave(ns, title, brand);
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ns = arrayMove(sections, sections.findIndex((s) => s.id === active.id), sections.findIndex((s) => s.id === over.id));
      setSections(ns); scheduleSave(ns, title, brand);
    }
  }
  function addSection(type: Section["type"]) {
    const sid = newId(); let section: Section;
    switch (type) {
      case "cover": section = { id: sid, type: "cover", title: "Proposal Title", subtitle: "" }; break;
      case "text": section = { id: sid, type: "text", heading: "New Section", body: "" }; break;
      case "pricing": section = { id: sid, type: "pricing", heading: "Investment", rows: [] }; break;
      case "terms": section = { id: sid, type: "terms", heading: "Terms & Conditions", body: "" }; break;
      case "signature": section = { id: sid, type: "signature", heading: "Accept This Proposal", message: "By typing your full name below, you agree to the terms outlined in this proposal." }; break;
      case "hero": section = { id: sid, type: "hero", headline: "Your Compelling Headline", subheadline: "Supporting subheadline text", ctaLabel: "Get Started", ctaUrl: "", bgColor: "#2563eb" }; break;
      case "services": section = { id: sid, type: "services", heading: "Our Services", items: [{ id: newId(), icon: "🚀", name: "Service One", description: "Brief description of this service." }] }; break;
      case "testimonials": section = { id: sid, type: "testimonials", heading: "What Clients Say", items: [{ id: newId(), quote: "Working with this team was an incredible experience.", name: "Jane Smith", role: "CEO", company: "Acme Corp" }] }; break;
      case "faq": section = { id: sid, type: "faq", heading: "Frequently Asked Questions", items: [{ id: newId(), question: "How long does the project take?", answer: "Typically 4–6 weeks depending on scope." }] }; break;
      case "cta": section = { id: sid, type: "cta", heading: "Ready to Get Started?", subtext: "Let's build something great together.", buttonLabel: "Contact Us", buttonUrl: "", bgColor: "#7c3aed" }; break;
      case "timeline": section = { id: sid, type: "timeline", heading: "Our Process", steps: [{ id: newId(), title: "Discovery", description: "We learn about your goals and requirements." }] }; break;
      case "layout": section = makeLayoutSection("1col"); break;
      default: return;
    }
    const ns = [...sections, section]; setSections(ns); setSelectedId(sid); setAddMenuOpen(false); scheduleSave(ns, title, brand);
    setTimeout(() => sectionRefs.current[sid]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }
  function scrollToSection(sectionId: string) { setSelectedId(sectionId); sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function updateBrand(newBrand: Brand) { setBrand(newBrand); scheduleSave(sections, title, newBrand); }
  async function handleSend() {
    if (!confirm("Send this proposal to the client?")) return; setSending(true);
    if (saveTimer.current) { clearTimeout(saveTimer.current); await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, sections, totalAmount: computeTotal(sections), brand }) }); }
    await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send" }) });
    setStatus("SENT"); setSending(false); setSaveState("saved");
  }
  function handleTitleBlur() { setEditingTitle(false); scheduleSave(sections, title, brand); }

  const clientName = proposal?.user.companyName || proposal?.user.name || "Client";
  const proposalDate = proposal ? new Date(Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  if (loading) return <div className="flex items-center justify-center h-full py-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const canvasStyle = { fontFamily: brand.font === "Inter" ? "Inter, sans-serif" : brand.font, "--brand-primary": brand.primaryColor, "--brand-accent": brand.accentColor } as React.CSSProperties;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        {editingTitle ? (
          <input ref={titleInputRef} className="text-lg font-semibold bg-transparent border-b border-primary outline-none text-foreground min-w-0 flex-1 max-w-sm" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()} autoFocus />
        ) : (
          <button className="text-lg font-semibold text-foreground hover:text-primary transition-colors truncate max-w-sm" onClick={() => setEditingTitle(true)} title="Click to edit title">{title || "Untitled Proposal"}</button>
        )}
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.DRAFT}`}>{status}</span>
        <div className="flex-1" />
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button onClick={() => setPreviewMode("desktop")} className={`p-1.5 flex items-center gap-1 text-xs px-2 ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}><Monitor className="h-3.5 w-3.5" /> Desktop</button>
          <button onClick={() => setPreviewMode("mobile")} className={`p-1.5 flex items-center gap-1 text-xs px-2 ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}><Smartphone className="h-3.5 w-3.5" /> Mobile</button>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
          {saveState === "saved" && <><Check className="h-3 w-3 text-green-500" /> Saved</>}
          {saveState === "unsaved" && "Unsaved changes..."}
        </span>
        <Button variant="outline" size="sm" onClick={() => window.open(`/admin/proposals/${id}/preview`, "_blank")}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
        <Button size="sm" onClick={handleSend} disabled={sending || status !== "DRAFT"} className={status !== "DRAFT" ? "opacity-50" : ""}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          {status === "DRAFT" ? "Send to Client" : "Already Sent"}
        </Button>
      </div>
      {/* PropertiesBar: shown when a layout section or block is selected */}
      {(() => {
        const layoutSel = layoutSelection;
        if (!layoutSel) return null;
        const sec = sections.find((s) => s.id === layoutSel.sectionId) as LayoutSection | undefined;
        if (!sec || sec.type !== "layout") return null;
        let block: import("./layout-types").Block | null = null;
        if (layoutSel.kind === "block") {
          for (const col of sec.columns) { const b = col.blocks.find((bl) => bl.id === layoutSel.blockId); if (b) { block = b; break; } }
        }
        return (
          <PropertiesBar
            selection={layoutSel}
            section={sec}
            block={block}
            onUpdateSection={(patch) => {
              const updated: LayoutSection = { ...sec, ...patch } as LayoutSection;
              updateSection(updated);
            }}
            onUpdateBlock={(patch) => {
              if (layoutSel.kind !== "block") return;
              const newCols = sec.columns.map((col) => ({
                ...col,
                blocks: col.blocks.map((bl) => bl.id === layoutSel.blockId ? { ...bl, ...patch } as import("./layout-types").Block : bl),
              }));
              updateSection({ ...sec, columns: newCols });
            }}
          />
        );
      })()}
      <div className="flex flex-1 min-h-0">
        <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
          <div className="flex border-b border-border">
            <button onClick={() => setSidebarTab("sections")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${sidebarTab === "sections" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}><FileText className="h-3.5 w-3.5" /> Sections</button>
            <button onClick={() => setSidebarTab("brand")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${sidebarTab === "brand" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}><Palette className="h-3.5 w-3.5" /> Brand</button>
          </div>
          {sidebarTab === "brand" ? (
            <div className="flex-1 overflow-y-auto"><BrandPanel brand={brand} onChange={updateBrand} /></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {sections.map((s, idx) => (
                      <SortableSidebarItem key={s.id} section={s} idx={idx} total={sections.length} isActive={s.id === selectedId} onSelect={() => scrollToSection(s.id)} onDuplicate={() => duplicateSection(s.id)} onDelete={() => deleteSection(s.id)} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <div className="p-2.5 border-t border-border relative">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setAddMenuOpen((v) => !v)}><Plus className="h-4 w-4 mr-2" /> Add Section</Button>
                {addMenuOpen && (
                  <div className="absolute bottom-full left-2.5 right-2.5 mb-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10 max-h-80 overflow-y-auto">
                    {([["cover", "Cover"], ["text", "Text Block"], ["pricing", "Pricing Table"], ["terms", "Terms & Conditions"], ["signature", "Signature"], ["hero", "Hero Banner"], ["services", "Services Grid"], ["testimonials", "Testimonials"], ["faq", "FAQ"], ["cta", "Call to Action"], ["timeline", "Timeline"]] as const).map(([type, label]) => {
                      const Icon = SECTION_ICONS[type];
                      return <button key={type} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors" onClick={() => addSection(type)}><Icon className="h-4 w-4 text-muted-foreground" /> {label}</button>;
                    })}
                    <div className="border-t border-border my-1" />
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors" onClick={() => addSection("layout")}><Layout className="h-4 w-4 text-muted-foreground" /> Layout Block</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto bg-[#f1f5f9]">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No sections yet</h3>
              <p className="text-gray-400 mt-1 text-sm">Add a section from the sidebar to start building your proposal.</p>
            </div>
          ) : (
            <div className="py-8 px-4">
              <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mx-auto transition-all ${previewMode === "mobile" ? "max-w-[390px]" : "max-w-4xl"}`} style={canvasStyle}>
                {brand.logoUrl && <div className="px-8 py-4 border-b border-gray-100 flex items-center"><img src={brand.logoUrl} alt="Company logo" className="h-8 object-contain" /></div>}
                <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  <p className="text-xs text-blue-600">Click any text to edit directly · Changes save automatically · Drag sections in sidebar to reorder</p>
                </div>
                <div className="px-12 py-2">
                  {sections.map((section) => (
                    <div key={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }} onClick={() => { setSelectedId(section.id); if (section.type !== "layout") setLayoutSelection(null); }} className={`relative group/canvas transition-all rounded-sm ${selectedId === section.id ? "ring-2 ring-blue-200 ring-offset-4" : ""}`}>
                      <SectionHoverToolbar onDuplicate={() => duplicateSection(section.id)} onDelete={() => deleteSection(section.id)} />
                      {section.type === "cover" && <WysiwygCover section={section} clientName={clientName} date={proposalDate} onChange={updateSection} />}
                      {section.type === "text" && <WysiwygText section={section} onChange={updateSection} />}
                      {section.type === "pricing" && <WysiwygPricing section={section} currency={currency} onChange={updateSection} />}
                      {section.type === "terms" && <WysiwygTerms section={section} onChange={updateSection} />}
                      {section.type === "signature" && <WysiwygSignature section={section} onChange={updateSection} />}
                      {section.type === "hero" && <WysiwygHero section={section} onChange={updateSection} />}
                      {section.type === "services" && <WysiwygServices section={section} onChange={updateSection} />}
                      {section.type === "testimonials" && <WysiwygTestimonials section={section} onChange={updateSection} />}
                      {section.type === "faq" && <WysiwygFaq section={section} onChange={updateSection} />}
                      {section.type === "cta" && <WysiwygCta section={section} onChange={updateSection} />}
                      {section.type === "timeline" && <WysiwygTimeline section={section} onChange={updateSection} />}
                      {section.type === "layout" && (
                        <LayoutSectionEditor
                          section={section as LayoutSection}
                          selection={layoutSelection?.sectionId === section.id ? layoutSelection : null}
                          onSelect={(sel) => { setLayoutSelection(sel); setSelectedId(section.id); }}
                          onUpdate={(updated) => updateSection(updated)}
                        />
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
  );
}
