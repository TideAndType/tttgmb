"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Type,
  Table,
  ScrollText,
  PenLine,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Eye,
  Send,
  Check,
  Loader2,
  GripVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PricingRow = {
  id: string;
  service: string;
  description: string;
  qty: number;
  unitPrice: number;
};

type Section =
  | { id: string; type: "cover"; title: string; subtitle: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "pricing"; heading: string; rows: PricingRow[] }
  | { id: string; type: "terms"; heading: string; body: string }
  | { id: string; type: "signature"; heading: string; message: string };

type Proposal = {
  id: string;
  title: string;
  status: string;
  currency: string;
  validUntil: string | null;
  sections: Section[];
  totalAmount: number | null;
  notes: string | null;
  user: { id: string; name: string; companyName: string | null };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function computeTotal(sections: Section[]): number {
  let total = 0;
  for (const s of sections) {
    if (s.type === "pricing") {
      for (const row of s.rows) total += row.qty * row.unitPrice;
    }
  }
  return total;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  cover: FileText,
  text: Type,
  pricing: Table,
  terms: ScrollText,
  signature: PenLine,
};

const SECTION_LABELS: Record<string, string> = {
  cover: "Cover",
  text: "Text Block",
  pricing: "Pricing Table",
  terms: "Terms & Conditions",
  signature: "Signature",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  VIEWED: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
};

// ─── ContentEditable wrapper ──────────────────────────────────────────────────

function Editable({
  sectionId,
  value,
  onChange,
  tag = "div",
  className = "",
  placeholder = "",
  singleLine = false,
}: {
  sectionId: string;
  value: string;
  onChange: (v: string) => void;
  tag?: "div" | "h1" | "h2" | "p" | "span";
  className?: string;
  placeholder?: string;
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const isComposing = useRef(false);

  // Initialise or reset content when switching sections
  useEffect(() => {
    if (ref.current) ref.current.innerText = value ?? "";
  }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const Tag = tag as any;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={(e: any) => {
        isComposing.current = false;
        onChange(e.currentTarget.innerText);
      }}
      onInput={(e: any) => {
        if (!isComposing.current) onChange(e.currentTarget.innerText);
      }}
      onKeyDown={(e: any) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`outline-none cursor-text ${className}`}
      data-placeholder={placeholder}
    />
  );
}

// ─── WYSIWYG Section renderers ────────────────────────────────────────────────

function WysiwygCover({
  section,
  clientName,
  date,
  onChange,
}: {
  section: Extract<Section, { type: "cover" }>;
  clientName: string;
  date: string;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="min-h-[360px] flex flex-col items-center justify-center text-center py-16 border-b border-gray-100 group/section">
      <style>{`.wysiwyg-editable[data-placeholder]:empty:before{content:attr(data-placeholder);color:#d1d5db;pointer-events:none}`}</style>
      <Editable
        sectionId={section.id}
        value={section.title}
        onChange={(v) => onChange({ ...section, title: v })}
        tag="h1"
        placeholder="Proposal Title"
        singleLine
        className="wysiwyg-editable text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight min-w-[200px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2"
      />
      <Editable
        sectionId={section.id}
        value={section.subtitle}
        onChange={(v) => onChange({ ...section, subtitle: v })}
        tag="p"
        placeholder="Subtitle or tagline..."
        singleLine
        className="wysiwyg-editable text-xl text-gray-400 mb-8 min-w-[160px] focus:ring-2 focus:ring-blue-200 focus:rounded px-2 -mx-2"
      />
      <div className="text-gray-400 text-sm space-y-1 pointer-events-none">
        <p>Prepared for <span className="font-medium text-gray-600">{clientName}</span></p>
        <p>{date}</p>
      </div>
    </div>
  );
}

function WysiwygText({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "text" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable
        sectionId={section.id}
        value={section.heading}
        onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2"
        placeholder="Section heading"
        singleLine
        className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <Editable
        sectionId={section.id}
        value={section.body}
        onChange={(v) => onChange({ ...section, body: v })}
        tag="p"
        placeholder="Write your content here..."
        className="wysiwyg-editable text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[80px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
    </div>
  );
}

function WysiwygPricing({
  section,
  currency,
  onChange,
}: {
  section: Extract<Section, { type: "pricing" }>;
  currency: string;
  onChange: (s: Section) => void;
}) {
  function updateRow(rowId: string, field: keyof PricingRow, value: string | number) {
    const rows = section.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r));
    onChange({ ...section, rows });
  }

  function addRow() {
    onChange({
      ...section,
      rows: [...section.rows, { id: newId(), service: "", description: "", qty: 1, unitPrice: 0 }],
    });
  }

  function removeRow(rowId: string) {
    onChange({ ...section, rows: section.rows.filter((r) => r.id !== rowId) });
  }

  const grandTotal = section.rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0);

  return (
    <div className="py-10 border-b border-gray-100">
      <Editable
        sectionId={section.id}
        value={section.heading}
        onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2"
        placeholder="Investment"
        singleLine
        className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-6 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <table className="w-full border-collapse text-sm mb-4">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 pr-4 font-semibold text-gray-700">Service</th>
            <th className="text-left py-3 pr-4 font-semibold text-gray-700">Description</th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-700 w-16">Qty</th>
            <th className="text-right py-3 pr-4 font-semibold text-gray-700 w-28">Unit Price</th>
            <th className="text-right py-3 font-semibold text-gray-700 w-24">Total</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 group/row">
              <td className="py-2 pr-4">
                <input
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 font-medium text-gray-900 placeholder:text-gray-300"
                  value={row.service}
                  onChange={(e) => updateRow(row.id, "service", e.target.value)}
                  placeholder="Service name"
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded px-1 -mx-1 text-gray-500 placeholder:text-gray-300"
                  value={row.description}
                  onChange={(e) => updateRow(row.id, "description", e.target.value)}
                  placeholder="Description"
                />
              </td>
              <td className="py-2 pr-4 text-right">
                <input
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700"
                  type="number"
                  min="0"
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, "qty", parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="py-2 pr-4 text-right">
                <input
                  className="w-full bg-transparent outline-none focus:bg-blue-50 focus:rounded text-right text-gray-700"
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => updateRow(row.id, "unitPrice", parseFloat(e.target.value) || 0)}
                />
              </td>
              <td className="py-2 text-right text-gray-900 font-medium">
                {fmt(row.qty * row.unitPrice, currency)}
              </td>
              <td className="py-2 pl-2">
                <button
                  onClick={() => removeRow(row.id)}
                  className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
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
              {fmt(grandTotal, currency)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <button
        onClick={addRow}
        className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add row
      </button>
    </div>
  );
}

function WysiwygTerms({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "terms" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10 border-b border-gray-100">
      <Editable
        sectionId={section.id}
        value={section.heading}
        onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2"
        placeholder="Terms & Conditions"
        singleLine
        className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <Editable
        sectionId={section.id}
        value={section.body}
        onChange={(v) => onChange({ ...section, body: v })}
        tag="div"
        placeholder="Write your terms here..."
        className="wysiwyg-editable text-xs text-gray-500 leading-relaxed whitespace-pre-wrap min-h-[120px] focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
    </div>
  );
}

function WysiwygSignature({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "signature" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="py-10">
      <Editable
        sectionId={section.id}
        value={section.heading}
        onChange={(v) => onChange({ ...section, heading: v })}
        tag="h2"
        placeholder="Accept This Proposal"
        singleLine
        className="wysiwyg-editable text-2xl font-bold text-gray-900 mb-4 focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <Editable
        sectionId={section.id}
        value={section.message}
        onChange={(v) => onChange({ ...section, message: v })}
        tag="p"
        placeholder="By typing your full name below, you agree to the terms outlined in this proposal."
        className="wysiwyg-editable text-gray-500 mb-8 whitespace-pre-wrap focus:ring-2 focus:ring-blue-200 focus:rounded px-1 -mx-1"
      />
      <div className="pointer-events-none opacity-50">
        <div className="flex gap-4">
          <div className="flex-1 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-center text-sm">
            Accept Proposal
          </div>
          <div className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-lg text-sm">
            Decline
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Client will see the accept / decline buttons here
        </p>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function ProposalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [status, setStatus] = useState("DRAFT");
  const [currency, setCurrency] = useState("USD");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProposal(data);
        setTitle(data.title);
        setStatus(data.status);
        setCurrency(data.currency);
        setSections(data.sections as Section[]);
        if ((data.sections as Section[]).length > 0) {
          setSelectedId((data.sections as Section[])[0].id);
        }
        setLoading(false);
      });
  }, [id]);

  const scheduleSave = useCallback(
    (newSections: Section[], newTitle: string) => {
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
          }),
        });
        setSaveState("saved");
      }, 1500);
    },
    [id]
  );

  function updateSection(updated: Section) {
    const newSections = sections.map((s) => (s.id === updated.id ? updated : s));
    setSections(newSections);
    scheduleSave(newSections, title);
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSections(arr);
    scheduleSave(arr, title);
  }

  function deleteSection(sectionId: string) {
    const newSections = sections.filter((s) => s.id !== sectionId);
    setSections(newSections);
    if (selectedId === sectionId) setSelectedId(newSections[0]?.id ?? null);
    scheduleSave(newSections, title);
  }

  function addSection(type: Section["type"]) {
    const sid = newId();
    let section: Section;
    switch (type) {
      case "cover":
        section = { id: sid, type: "cover", title: "Proposal Title", subtitle: "" };
        break;
      case "text":
        section = { id: sid, type: "text", heading: "New Section", body: "" };
        break;
      case "pricing":
        section = { id: sid, type: "pricing", heading: "Investment", rows: [] };
        break;
      case "terms":
        section = { id: sid, type: "terms", heading: "Terms & Conditions", body: "" };
        break;
      case "signature":
        section = {
          id: sid,
          type: "signature",
          heading: "Accept This Proposal",
          message: "By typing your full name below, you agree to the terms outlined in this proposal.",
        };
        break;
    }
    const newSections = [...sections, section];
    setSections(newSections);
    setSelectedId(sid);
    setAddMenuOpen(false);
    scheduleSave(newSections, title);
    // Scroll to new section after render
    setTimeout(() => {
      sectionRefs.current[sid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function scrollToSection(sectionId: string) {
    setSelectedId(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSend() {
    if (!confirm("Send this proposal to the client? They will be able to view and accept it.")) return;
    setSending(true);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sections, totalAmount: computeTotal(sections) }),
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

  function handleTitleBlur() {
    setEditingTitle(false);
    scheduleSave(sections, title);
  }

  const clientName = proposal?.user.companyName || proposal?.user.name || "Client";
  const proposalDate = proposal
    ? new Date(proposal ? Date.now() : 0).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card shrink-0">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="text-lg font-semibold bg-transparent border-b border-primary outline-none text-foreground min-w-0 flex-1 max-w-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
            autoFocus
          />
        ) : (
          <button
            className="text-lg font-semibold text-foreground hover:text-primary transition-colors truncate max-w-sm"
            onClick={() => setEditingTitle(true)}
            title="Click to edit title"
          >
            {title || "Untitled Proposal"}
          </button>
        )}

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.DRAFT}`}
        >
          {status}
        </span>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saveState === "saving" && (
            <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
          )}
          {saveState === "saved" && (
            <><Check className="h-3 w-3 text-green-500" /> Saved</>
          )}
          {saveState === "unsaved" && "Unsaved changes..."}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/admin/proposals/${id}/preview`, "_blank")}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>

        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || status !== "DRAFT"}
          className={status !== "DRAFT" ? "opacity-50" : ""}
        >
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          {status === "DRAFT" ? "Send to Client" : "Already Sent"}
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sections</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sections.map((s, idx) => {
              const Icon = SECTION_ICONS[s.type] ?? FileText;
              const label =
                s.type === "cover"
                  ? (s as any).title || "Cover"
                  : (s as any).heading || SECTION_LABELS[s.type];
              const isActive = s.id === selectedId;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  onClick={() => scrollToSection(s.id)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-sm truncate">{label}</span>
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, 1); }}
                      disabled={idx === sections.length - 1}
                      className="p-0.5 hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSection(s.id); }}
                      className="p-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add section */}
          <div className="p-2.5 border-t border-border relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddMenuOpen((v) => !v)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
            {addMenuOpen && (
              <div className="absolute bottom-full left-2.5 right-2.5 mb-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10">
                {(
                  [
                    ["cover", "Cover"],
                    ["text", "Text Block"],
                    ["pricing", "Pricing Table"],
                    ["terms", "Terms & Conditions"],
                    ["signature", "Signature"],
                  ] as const
                ).map(([type, label]) => {
                  const Icon = SECTION_ICONS[type];
                  return (
                    <button
                      key={type}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => addSection(type)}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* WYSIWYG Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#f1f5f9]">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No sections yet</h3>
              <p className="text-gray-400 mt-1 text-sm">
                Add a section from the sidebar to start building your proposal.
              </p>
            </div>
          ) : (
            <div className="py-8 px-4">
              <div className="bg-white max-w-4xl mx-auto rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Editing hint */}
                <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  <p className="text-xs text-blue-600">
                    Click any text to edit directly · Changes save automatically
                  </p>
                </div>

                <div className="px-12 py-2">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      ref={(el) => { sectionRefs.current[section.id] = el; }}
                      onClick={() => setSelectedId(section.id)}
                      className={`transition-all rounded-sm ${
                        selectedId === section.id
                          ? "ring-2 ring-blue-200 ring-offset-4"
                          : ""
                      }`}
                    >
                      {section.type === "cover" && (
                        <WysiwygCover
                          section={section}
                          clientName={clientName}
                          date={proposalDate}
                          onChange={updateSection}
                        />
                      )}
                      {section.type === "text" && (
                        <WysiwygText section={section} onChange={updateSection} />
                      )}
                      {section.type === "pricing" && (
                        <WysiwygPricing
                          section={section}
                          currency={currency}
                          onChange={updateSection}
                        />
                      )}
                      {section.type === "terms" && (
                        <WysiwygTerms section={section} onChange={updateSection} />
                      )}
                      {section.type === "signature" && (
                        <WysiwygSignature section={section} onChange={updateSection} />
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
