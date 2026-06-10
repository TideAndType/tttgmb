"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Trash2,
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
  | {
      id: string;
      type: "pricing";
      heading: string;
      rows: PricingRow[];
    }
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
      for (const row of s.rows) {
        total += row.qty * row.unitPrice;
      }
    }
  }
  return total;
}

function formatCurrency(amount: number, currency: string) {
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

// ─── Section Editors ──────────────────────────────────────────────────────────

function CoverEditor({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "cover" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Title</label>
        <Input
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="Proposal title"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Subtitle</label>
        <Input
          value={section.subtitle}
          onChange={(e) => onChange({ ...section, subtitle: e.target.value })}
          placeholder="e.g. Thank you for considering our services."
        />
      </div>
    </div>
  );
}

function TextEditor({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "text" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Heading</label>
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="Section heading"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Body</label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono min-h-[240px] resize-y"
          value={section.body}
          onChange={(e) => onChange({ ...section, body: e.target.value })}
          placeholder="Write your content here..."
        />
      </div>
    </div>
  );
}

function PricingEditor({
  section,
  currency,
  onChange,
}: {
  section: Extract<Section, { type: "pricing" }>;
  currency: string;
  onChange: (s: Section) => void;
}) {
  function updateRow(rowId: string, field: keyof PricingRow, value: string | number) {
    const rows = section.rows.map((r) =>
      r.id === rowId ? { ...r, [field]: value } : r
    );
    onChange({ ...section, rows });
  }

  function addRow() {
    const rows = [
      ...section.rows,
      { id: newId(), service: "", description: "", qty: 1, unitPrice: 0 },
    ];
    onChange({ ...section, rows });
  }

  function removeRow(rowId: string) {
    onChange({ ...section, rows: section.rows.filter((r) => r.id !== rowId) });
  }

  const grandTotal = section.rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Heading</label>
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="e.g. Investment"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Service</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Qty</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Unit Price</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={row.service}
                    onChange={(e) => updateRow(row.id, "service", e.target.value)}
                    placeholder="Service name"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, "description", e.target.value)}
                    placeholder="Brief description"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    type="number"
                    min="0"
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, "qty", parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.id, "unitPrice", parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="px-3 py-1.5 text-right text-foreground font-medium">
                  {formatCurrency(row.qty * row.unitPrice, currency)}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td colSpan={4} className="px-3 py-2 text-right font-semibold text-foreground">
                Grand Total
              </td>
              <td className="px-3 py-2 text-right font-bold text-foreground">
                {formatCurrency(grandTotal, currency)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-2" />
        Add Row
      </Button>
    </div>
  );
}

function TermsEditor({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "terms" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Heading</label>
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="e.g. Terms & Conditions"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Body</label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[300px] resize-y"
          value={section.body}
          onChange={(e) => onChange({ ...section, body: e.target.value })}
          placeholder="Write your terms here..."
        />
      </div>
    </div>
  );
}

function SignatureEditor({
  section,
  onChange,
}: {
  section: Extract<Section, { type: "signature" }>;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Heading</label>
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
          placeholder="e.g. Accept This Proposal"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Message</label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px] resize-y"
          value={section.message}
          onChange={(e) => onChange({ ...section, message: e.target.value })}
          placeholder="e.g. By typing your full name below, you agree to the terms outlined in this proposal."
        />
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function ProposalEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
        const total = computeTotal(newSections);
        await fetch(`/api/proposals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle,
            sections: newSections,
            totalAmount: total,
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
    if (selectedId === sectionId) {
      setSelectedId(newSections[0]?.id ?? null);
    }
    scheduleSave(newSections, title);
  }

  function addSection(type: Section["type"]) {
    let section: Section;
    const sid = newId();
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
  }

  async function handleSend() {
    if (!confirm("Send this proposal to the client? They will be able to view and accept it.")) return;
    setSending(true);
    // flush any pending save first
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      const total = computeTotal(sections);
      await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sections, totalAmount: total }),
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

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

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
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="h-3 w-3 text-green-500" /> Saved
            </>
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
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {status === "DRAFT" ? "Send to Client" : "Already Sent"}
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
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
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm truncate">{label}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="p-3 border-t border-border relative">
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
              <div className="absolute bottom-full left-3 right-3 mb-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10">
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

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-8 bg-background">
          {selectedSection ? (
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                {(() => {
                  const Icon = SECTION_ICONS[selectedSection.type] ?? FileText;
                  return <Icon className="h-5 w-5 text-muted-foreground" />;
                })()}
                <h2 className="text-lg font-semibold text-foreground">
                  {SECTION_LABELS[selectedSection.type]}
                </h2>
              </div>

              {selectedSection.type === "cover" && (
                <CoverEditor
                  section={selectedSection}
                  onChange={updateSection}
                />
              )}
              {selectedSection.type === "text" && (
                <TextEditor
                  section={selectedSection}
                  onChange={updateSection}
                />
              )}
              {selectedSection.type === "pricing" && (
                <PricingEditor
                  section={selectedSection}
                  currency={currency}
                  onChange={updateSection}
                />
              )}
              {selectedSection.type === "terms" && (
                <TermsEditor
                  section={selectedSection}
                  onChange={updateSection}
                />
              )}
              {selectedSection.type === "signature" && (
                <SignatureEditor
                  section={selectedSection}
                  onChange={updateSection}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">No section selected</h3>
              <p className="text-muted-foreground mt-1">
                Select a section from the sidebar or add a new one to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
