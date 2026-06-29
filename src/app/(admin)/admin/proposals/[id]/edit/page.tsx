"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText, Type, Table, ScrollText, PenLine, Plus, X, Eye, Send,
  Check, Loader2, GripVertical, Copy, Trash2, Monitor, Smartphone,
  Layout, Palette, Star, MessageSquare, HelpCircle, Megaphone, GitBranch, Sparkles, Link2, Download,
  Image as ImageIcon, Video as VideoIcon, Upload, BookmarkPlus, Library, Braces,
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
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { SectionAiPanel } from "@/components/proposals/section-ai-panel";
import { toEmbedUrl } from "@/lib/embed";
import { sectionWrapper, type SectionSettings } from "@/lib/section-style";
import { MERGE_FIELDS } from "@/lib/merge-fields";

type Recurrence = "one_time" | "monthly" | "yearly";
type PricingRow = { id: string; service: string; description: string; qty: number; unitPrice: number; optional?: boolean; selected?: boolean; recurrence?: Recurrence };
type ServiceItem = { id: string; icon: string; name: string; description: string };
type TestimonialItem = { id: string; quote: string; name: string; role: string; company: string };
type FaqItem = { id: string; question: string; answer: string };
type TimelineStep = { id: string; title: string; description: string };

type Section = (
  | { id: string; type: "cover"; title: string; subtitle: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "pricing"; heading: string; rows: PricingRow[]; discountPercent?: number }
  | { id: string; type: "terms"; heading: string; body: string }
  | { id: string; type: "signature"; heading: string; message: string }
  | { id: string; type: "hero"; headline: string; subheadline: string; ctaLabel: string; ctaUrl: string; bgColor: string; bgVideo?: string }
  | { id: string; type: "services"; heading: string; items: ServiceItem[] }
  | { id: string; type: "testimonials"; heading: string; items: TestimonialItem[] }
  | { id: string; type: "faq"; heading: string; items: FaqItem[] }
  | { id: string; type: "cta"; heading: string; subtext: string; buttonLabel: string; buttonUrl: string; bgColor: string; bgVideo?: string }
  | { id: string; type: "timeline"; heading: string; steps: TimelineStep[] }
  | { id: string; type: "image"; url: string; caption: string }
  | { id: string; type: "video"; url: string; caption: string }
  | LayoutSection
) & { settings?: SectionSettings };

type Brand = { primaryColor: string; accentColor: string; font: string; logoUrl: string };

type Proposal = {
  id: string; title: string; status: string; currency: string; validUntil: string | null;
  sections: Section[]; totalAmount: number | null; notes: string | null; brand: Brand | null;
  user: { id: string; name: string; companyName: string | null };
};

const DEFAULT_BRAND: Brand = { primaryColor: "#2563eb", accentColor: "#7c3aed", font: "Inter", logoUrl: "" };

function newId() { return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// Deep-clone a section and assign fresh ids to it and any nested objects with
// an `id` (rows, items, steps, columns, blocks) so library inserts don't collide.
function cloneWithNewIds<T>(obj: T): T {
  const clone = JSON.parse(JSON.stringify(obj));
  const walk = (node: any) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      if (typeof node.id === "string") node.id = newId();
      Object.values(node).forEach(walk);
    }
  };
  walk(clone);
  return clone;
}

// A row is included unless it's optional and not pre-selected.
function rowIncluded(r: PricingRow): boolean {
  return !r.optional || r.selected === true;
}

function computeTotal(sections: Section[]): number {
  let total = 0;
  for (const s of sections) {
    if (s.type === "pricing") {
      let sub = 0;
      for (const row of s.rows) if (rowIncluded(row)) sub += row.qty * row.unitPrice;
      if (s.discountPercent) sub = sub * (1 - s.discountPercent / 100);
      total += sub;
    }
  }
  return total;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  cover: FileText, text: Type, pricing: Table, terms: ScrollText, signature: PenLine,
  hero: Layout, services: Star, testimonials: MessageSquare, faq: HelpCircle, cta: Megaphone, timeline: GitBranch, layout: Layout,
  image: ImageIcon, video: VideoIcon,
};

const SECTION_LABELS: Record<string, string> = {
  cover: "Cover", text: "Text Block", pricing: "Pricing Table", terms: "Terms & Conditions", signature: "Signature",
  hero: "Hero Banner", services: "Services", testimonials: "Testimonials", faq: "FAQ", cta: "Call to Action", timeline: "Timeline", layout: "Layout Block",
  image: "Image", video: "Video",
};

// Downscale an image file to a ~1200px-wide JPEG data URL (DB/Vercel-safe).
function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

function SortableSidebarItem({ section, idx, total, isActive, onSelect, onDuplicate, onDelete, onSaveToLibrary, onRename }: {
  section: Section; idx: number; total: number; isActive: boolean;
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void; onSaveToLibrary: () => void; onRename: (name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const Icon = SECTION_ICONS[section.type] ?? FileText;
  const label = section.type === "cover" ? (section as any).title || "Cover" : (section as any).heading || SECTION_LABELS[section.type];
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(label);
  const commit = () => { setRenaming(false); const v = draft.trim(); if (v && v !== label) onRename(v); };
  return (
    <div ref={setNodeRef} style={style}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
      onClick={onSelect}>
      <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {renaming ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setRenaming(false); }} onClick={(e) => e.stopPropagation()} className="flex-1 text-sm bg-background border border-primary rounded px-1 outline-none min-w-0" />
      ) : (
        <span className="flex-1 text-sm truncate" onDoubleClick={(e) => { e.stopPropagation(); setDraft(label); setRenaming(true); }} title="Double-click to rename">{label}</span>
      )}
      <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onSaveToLibrary(); }} className="p-0.5 hover:text-primary" title="Save to library"><BookmarkPlus className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-blue-500" title="Duplicate"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function WysiwygCover({ section, clientName, date, onChange, onAiClick }: {
  section: Extract<Section, { type: "cover" }>; clientName: string; date: string; onChange: (s: Section) => void; onAiClick?: () => void;
}) {
  return (
    <div className="min-h-[360px] flex flex-col items-center justify-center text-center py-16 border-b border-gray-100 relative">
      <style>{`.wysiwyg-editable[data-placeholder]:empty:before{content:attr(data-placeholder);color:#d1d5db;pointer-events:none}`}</style>
      {onAiClick && <button onClick={onAiClick} className="absolute top-4 right-4 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      <Editable sectionId={section.id} value={section.title} onChange={(v) => onChange({ ...section, title: v })} tag="h1" placeholder="Proposal Title" singleLine className="wysiwyg-editable text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight min-w-[200px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2" />
      <Editable sectionId={section.id} value={section.subtitle} onChange={(v) => onChange({ ...section, subtitle: v })} tag="p" placeholder="Subtitle or tagline..." singleLine className="wysiwyg-editable text-xl text-gray-400 mb-8 min-w-[160px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2" />
      <div className="text-gray-400 text-sm space-y-1 pointer-events-none">
        <p>Prepared for <span className="font-medium text-gray-600">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function WysiwygText({ section, onChange, onAiClick }: { section: Extract<Section, { type: "text" }>; onChange: (s: Section) => void; onAiClick?: () => void }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-4">
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Section heading" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1 flex-1" />
        {onAiClick && <button onClick={onAiClick} className="shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      </div>
      <Editable sectionId={section.id} value={section.body} onChange={(v) => onChange({ ...section, body: v })} tag="p" placeholder="Write your content here..." className="wysiwyg-editable text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[80px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1" />
    </div>
  );
}

function WysiwygPricing({ section, currency, onChange }: { section: Extract<Section, { type: "pricing" }>; currency: string; onChange: (s: Section) => void }) {
  function updateRow(rowId: string, field: keyof PricingRow, value: string | number) {
    onChange({ ...section, rows: section.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)) });
  }
  const grandTotal = (() => {
    let sub = section.rows.reduce((s, r) => s + (rowIncluded(r) ? r.qty * r.unitPrice : 0), 0);
    if (section.discountPercent) sub = sub * (1 - section.discountPercent / 100);
    return sub;
  })();
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
            <tr key={row.id} className="border-b border-gray-100 group/row align-top">
              <td className="py-2 pr-4">
                <input className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 font-medium text-gray-900 placeholder:text-gray-300" value={row.service} onChange={(e) => updateRow(row.id, "service", e.target.value)} placeholder="Service name" />
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-1 text-[11px] text-gray-400"><input type="checkbox" checked={!!row.optional} onChange={(e) => updateRow(row.id, "optional", e.target.checked as any)} className="h-3 w-3 accent-blue-600" /> Optional</label>
                  {row.optional && <label className="flex items-center gap-1 text-[11px] text-gray-400"><input type="checkbox" checked={!!row.selected} onChange={(e) => updateRow(row.id, "selected", e.target.checked as any)} className="h-3 w-3 accent-blue-600" /> Pre-selected</label>}
                  <select value={row.recurrence || "one_time"} onChange={(e) => updateRow(row.id, "recurrence", e.target.value as any)} className="text-[11px] text-gray-500 border border-gray-200 rounded px-1 py-0.5 bg-white">
                    <option value="one_time">One-time</option>
                    <option value="monthly">/ month</option>
                    <option value="yearly">/ year</option>
                  </select>
                </div>
              </td>
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => onChange({ ...section, rows: [...section.rows, { id: newId(), service: "", description: "", qty: 1, unitPrice: 0 }] })} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"><Plus className="h-3.5 w-3.5" /> Add row</button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">Discount %
          <input type="number" min="0" max="100" value={section.discountPercent ?? ""} onChange={(e) => onChange({ ...section, discountPercent: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="0" className="w-16 border border-gray-200 rounded px-2 py-1 text-right" />
        </label>
      </div>
    </div>
  );
}

function WysiwygTerms({ section, onChange, onAiClick }: { section: Extract<Section, { type: "terms" }>; onChange: (s: Section) => void; onAiClick?: () => void }) {
  return (
    <div className="py-10 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-4">
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Terms & Conditions" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1 flex-1" />
        {onAiClick && <button onClick={onAiClick} className="shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      </div>
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

function WysiwygServices({ section, onChange, onAiClick }: { section: Extract<Section, { type: "services" }>; onChange: (s: Section) => void; onAiClick?: () => void }) {
  function updateItem(itemId: string, field: keyof ServiceItem, value: string) {
    onChange({ ...section, items: section.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-8">
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Our Services" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 text-center focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1 flex-1" />
        {onAiClick && <button onClick={onAiClick} className="shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      </div>
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

function WysiwygFaq({ section, onChange, onAiClick }: { section: Extract<Section, { type: "faq" }>; onChange: (s: Section) => void; onAiClick?: () => void }) {
  function updateItem(itemId: string, field: keyof FaqItem, value: string) {
    onChange({ ...section, items: section.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-8">
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Frequently Asked Questions" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1 flex-1" />
        {onAiClick && <button onClick={onAiClick} className="shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      </div>
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

function WysiwygTimeline({ section, onChange, onAiClick }: { section: Extract<Section, { type: "timeline" }>; onChange: (s: Section) => void; onAiClick?: () => void }) {
  function updateStep(stepId: string, field: keyof TimelineStep, value: string) {
    onChange({ ...section, steps: section.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)) });
  }
  return (
    <div className="py-10 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-8">
        <Editable sectionId={section.id} value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} tag="h2" placeholder="Our Process" singleLine className="wysiwyg-editable text-2xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1 flex-1" />
        {onAiClick && <button onClick={onAiClick} className="shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 bg-purple-50 hover:bg-purple-100 transition-colors opacity-0 group-hover/canvas:opacity-100" title="Generate with Claude"><Sparkles className="h-3 w-3" /> AI</button>}
      </div>
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

function WysiwygImage({ section, onChange }: { section: Extract<Section, { type: "image" }>; onChange: (s: Section) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { onChange({ ...section, url: await imageFileToDataUrl(f) }); } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div className="py-10 border-b border-gray-100">
      {section.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.url} alt={section.caption || "Image"} className="w-full rounded-lg" />
      ) : (
        <div className="w-full rounded-lg border-2 border-dashed border-gray-300 py-16 text-center text-gray-400 text-sm">No image yet — paste a URL or upload below</div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <input value={section.url.startsWith("data:") ? "" : section.url} onChange={(e) => onChange({ ...section, url: e.target.value })} placeholder="Image URL (https://…)" className="flex-1 min-w-[180px] text-sm border border-gray-200 rounded px-2 py-1.5" />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" /> Upload</>}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      <input value={section.caption} onChange={(e) => onChange({ ...section, caption: e.target.value })} placeholder="Caption (optional)" className="w-full text-sm text-gray-500 text-center mt-2 bg-transparent outline-none focus:bg-blue-50 rounded px-1 py-1" />
    </div>
  );
}

function WysiwygVideo({ section, onChange }: { section: Extract<Section, { type: "video" }>; onChange: (s: Section) => void }) {
  const embed = toEmbedUrl(section.url);
  return (
    <div className="py-10 border-b border-gray-100">
      {embed ? (
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
          {embed.kind === "iframe" ? (
            <iframe src={embed.src} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          ) : (
            <video src={embed.src} controls className="absolute inset-0 w-full h-full" />
          )}
        </div>
      ) : (
        <div className="w-full rounded-lg border-2 border-dashed border-gray-300 py-16 text-center text-gray-400 text-sm">Paste a YouTube, Vimeo, or .mp4 URL below</div>
      )}
      <input value={section.url} onChange={(e) => onChange({ ...section, url: e.target.value })} placeholder="Video URL (YouTube, Vimeo, or .mp4)" className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mt-3" />
      <input value={section.caption} onChange={(e) => onChange({ ...section, caption: e.target.value })} placeholder="Caption (optional)" className="w-full text-sm text-gray-500 text-center mt-2 bg-transparent outline-none focus:bg-blue-50 rounded px-1 py-1" />
    </div>
  );
}

function SectionInspector({ section, onChange, onClose }: { section: Section; onChange: (s: Section) => void; onClose: () => void }) {
  const s = section.settings || {};
  const set = (patch: Partial<SectionSettings>) => onChange({ ...section, settings: { ...s, ...patch } } as Section);
  const row = "space-y-1";
  const lbl = "text-xs font-medium text-muted-foreground uppercase tracking-wide block";
  return (
    <div className="w-64 shrink-0 border-l border-border bg-card overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Section settings</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-4">
        <div className={row}>
          <label className={lbl}>Background color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={s.bgColor || "#ffffff"} onChange={(e) => set({ bgColor: e.target.value })} className="h-8 w-12 rounded border border-border cursor-pointer" />
            <input type="text" value={s.bgColor || ""} onChange={(e) => set({ bgColor: e.target.value })} placeholder="none" className="flex-1 text-sm border border-border rounded px-2 py-1.5 font-mono bg-background" />
            {s.bgColor && <button onClick={() => set({ bgColor: undefined })} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
        <div className={row}>
          <label className={lbl}>Background image URL</label>
          <input type="text" value={s.bgImage || ""} onChange={(e) => set({ bgImage: e.target.value || undefined })} placeholder="https://…" className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background" />
        </div>
        <div className={row}>
          <label className={lbl}>Vertical padding (px)</label>
          <input type="number" min="0" step="8" value={s.paddingY ?? ""} onChange={(e) => set({ paddingY: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="default" className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background" />
        </div>
        <div className={row}>
          <label className={lbl}>Max width</label>
          <select value={s.maxWidth || "normal"} onChange={(e) => set({ maxWidth: e.target.value as SectionSettings["maxWidth"] })} className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background">
            <option value="normal">Default</option>
            <option value="narrow">Narrow</option>
            <option value="wide">Wide</option>
            <option value="full">Full width</option>
          </select>
        </div>
        <div className={row}>
          <label className={lbl}>Text alignment</label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} onClick={() => set({ align: a })} className={`flex-1 text-xs py-1.5 rounded border capitalize ${(s.align || "left") === a ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{a}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!s.hidden} onChange={(e) => set({ hidden: e.target.checked })} className="h-4 w-4 accent-primary" />
          Hidden (won&apos;t show to client)
        </label>
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
  const [mergeOpen, setMergeOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<{ id: string; name: string; category: string | null; data: any }[]>([]);

  const loadLibrary = useCallback(async () => {
    const res = await fetch("/api/proposal-library");
    if (res.ok) setLibraryItems((await res.json()).items || []);
  }, []);
  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  async function saveToLibrary(section: Section) {
    const def = (section as any).heading || (section as any).title || SECTION_LABELS[section.type] || "Saved block";
    const name = window.prompt("Save this section to your library as:", def);
    if (!name) return;
    const category = window.prompt("Category (optional, e.g. About Us, Terms):", "") || undefined;
    const res = await fetch("/api/proposal-library", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, data: section }),
    });
    if (res.ok) loadLibrary();
  }

  function insertFromLibrary(item: { data: any }) {
    const section = cloneWithNewIds(item.data) as Section;
    section.id = newId();
    const ns = [...sections, section];
    setSections(ns); setSelectedId(section.id); setLibraryOpen(false); scheduleSave(ns, title, brand);
    setTimeout(() => sectionRefs.current[section.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function deleteLibraryItem(itemId: string) {
    await fetch(`/api/proposal-library/${itemId}`, { method: "DELETE" });
    setLibraryItems((prev) => prev.filter((i) => i.id !== itemId));
  }
  const [sending, setSending] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<any | null>(null);
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

  // Explicit "Save Draft" — flush any pending autosave immediately.
  const saveDraft = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, sections, totalAmount: computeTotal(sections), brand }) });
      setSaveState("saved");
    } catch {
      setSaveState("unsaved");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title, sections, brand]);

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
      case "image": section = { id: sid, type: "image", url: "", caption: "" }; break;
      case "video": section = { id: sid, type: "video", url: "", caption: "" }; break;
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
  async function handleShare() {
    const res = await fetch(`/api/proposals/${id}/share`, { method: "POST" });
    const data = await res.json();
    setShareUrl(data.url);
    await navigator.clipboard.writeText(data.url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  }

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
        <Button variant="outline" size="sm" onClick={saveDraft} disabled={saveState === "saving"}>
          {saveState === "saving" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save Draft
        </Button>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setMergeOpen((v) => !v)}><Braces className="h-4 w-4 mr-2" /> Merge Fields</Button>
          {mergeOpen && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-md shadow-lg z-30 p-2">
              <p className="text-xs text-muted-foreground px-2 py-1">Type these anywhere — they auto-fill for the client. Click to copy.</p>
              {MERGE_FIELDS.map((f) => (
                <button key={f.token} onClick={() => { navigator.clipboard?.writeText(f.token).catch(() => {}); }} className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-accent text-left">
                  <span className="font-mono text-xs text-primary">{f.token}</span>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setAiPanelOpen(true)}><Sparkles className="h-4 w-4 mr-2" /> AI Assist</Button>
        <Button variant="outline" size="sm" onClick={handleShare} title="Generate a public share link (no login required)">
          <Link2 className="h-4 w-4 mr-2" />{shareCopied ? "Copied!" : "Share Link"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(`/admin/proposals/${id}/pdf`, "_blank")}><Download className="h-4 w-4 mr-2" /> PDF</Button>
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
                      <SortableSidebarItem key={s.id} section={s} idx={idx} total={sections.length} isActive={s.id === selectedId} onSelect={() => scrollToSection(s.id)} onDuplicate={() => duplicateSection(s.id)} onDelete={() => deleteSection(s.id)} onSaveToLibrary={() => saveToLibrary(s)} onRename={(name) => updateSection({ ...s, ...(s.type === "cover" ? { title: name } : { heading: name }) } as Section)} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <div className="p-2.5 border-t border-border relative space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setLibraryOpen((v) => !v); setAddMenuOpen(false); }}>
                  <Library className="h-4 w-4 mr-2" /> Insert from Library
                </Button>
                {libraryOpen && (
                  <div className="absolute bottom-full left-2.5 right-2.5 mb-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10 max-h-80 overflow-y-auto">
                    {libraryItems.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">No saved blocks yet. Hover a section in the outline and click the bookmark to save it here.</p>
                    ) : (
                      libraryItems.map((item) => (
                        <div key={item.id} className="flex items-center group">
                          <button className="flex-1 flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left" onClick={() => insertFromLibrary(item)}>
                            <Library className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.name}{item.category ? <span className="text-xs text-muted-foreground"> · {item.category}</span> : null}</span>
                          </button>
                          <button onClick={() => deleteLibraryItem(item.id)} className="px-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Remove from library"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setAddMenuOpen((v) => !v); setLibraryOpen(false); }}><Plus className="h-4 w-4 mr-2" /> Add Section</Button>
                {addMenuOpen && (
                  <div className="absolute bottom-full left-2.5 right-2.5 mb-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10 max-h-80 overflow-y-auto">
                    {([["cover", "Cover"], ["text", "Text Block"], ["pricing", "Pricing Table"], ["terms", "Terms & Conditions"], ["signature", "Signature"], ["hero", "Hero Banner"], ["services", "Services Grid"], ["testimonials", "Testimonials"], ["faq", "FAQ"], ["cta", "Call to Action"], ["timeline", "Timeline"], ["image", "Image"], ["video", "Video"]] as const).map(([type, label]) => {
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
                  {sections.map((section) => {
                    const w = sectionWrapper(section.settings);
                    return (
                    <div key={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }} onClick={() => { setSelectedId(section.id); if (section.type !== "layout") setLayoutSelection(null); }} style={w.style} className={`relative group/canvas transition-all rounded-sm ${w.alignClass} ${section.settings?.hidden ? "opacity-40" : ""} ${selectedId === section.id ? "ring-2 ring-blue-200 ring-offset-4" : ""}`}>
                      <SectionHoverToolbar onDuplicate={() => duplicateSection(section.id)} onDelete={() => deleteSection(section.id)} />
                      {section.settings?.hidden && <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold uppercase tracking-wide bg-gray-800 text-white px-1.5 py-0.5 rounded">Hidden</span>}
                      <div className={w.hasInner ? w.innerClass : ""}>
                      {section.type === "cover" && <WysiwygCover section={section} clientName={clientName} date={proposalDate} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "text" && <WysiwygText section={section} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "pricing" && <WysiwygPricing section={section} currency={currency} onChange={updateSection} />}
                      {section.type === "terms" && <WysiwygTerms section={section} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "signature" && <WysiwygSignature section={section} onChange={updateSection} />}
                      {section.type === "hero" && <WysiwygHero section={section} onChange={updateSection} />}
                      {section.type === "services" && <WysiwygServices section={section} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "testimonials" && <WysiwygTestimonials section={section} onChange={updateSection} />}
                      {section.type === "faq" && <WysiwygFaq section={section} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "cta" && <WysiwygCta section={section} onChange={updateSection} />}
                      {section.type === "timeline" && <WysiwygTimeline section={section} onChange={updateSection} onAiClick={() => setAiTarget(section)} />}
                      {section.type === "image" && <WysiwygImage section={section} onChange={updateSection} />}
                      {section.type === "video" && <WysiwygVideo section={section} onChange={updateSection} />}
                      {section.type === "layout" && (
                        <LayoutSectionEditor
                          section={section as LayoutSection}
                          selection={layoutSelection?.sectionId === section.id ? layoutSelection : null}
                          onSelect={(sel) => { setLayoutSelection(sel); setSelectedId(section.id); }}
                          onUpdate={(updated) => updateSection(updated)}
                        />
                      )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        {(() => {
          const sel = sections.find((s) => s.id === selectedId);
          // Layout sections use the PropertiesBar; everything else uses this inspector.
          if (!sel || sel.type === "layout") return null;
          return <SectionInspector section={sel} onChange={updateSection} onClose={() => setSelectedId(null)} />;
        })()}
      </div>
      <AiAssistPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onInsert={(text) => {
          const sid = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newSection = { id: sid, type: "text" as const, heading: "AI Generated Content", body: text };
          setSections((prev) => [...prev, newSection]);
          setAiPanelOpen(false);
        }}
        defaultAction="proposal_section"
      />
      {aiTarget && (
        <SectionAiPanel
          section={aiTarget}
          proposalTitle={title}
          clientName={clientName}
          onClose={() => setAiTarget(null)}
          onApply={(updated) => { updateSection(updated); setAiTarget(null); }}
        />
      )}
    </div>
  );
}
