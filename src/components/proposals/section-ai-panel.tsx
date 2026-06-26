"use client";

import { useState } from "react";
import { X, Loader2, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tone = "professional" | "friendly" | "concise";

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
  | { id: string; type: "timeline"; heading: string; steps: TimelineStep[] };

const SECTION_LABELS: Record<string, string> = {
  cover: "Cover Page",
  text: "Text Block",
  terms: "Terms & Conditions",
  services: "Services Grid",
  faq: "FAQ",
  timeline: "Timeline",
};

function uid() { return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function buildPrompt(section: Section, proposalTitle: string, clientName: string, userPrompt: string): string {
  const base = `Proposal: "${proposalTitle}" — Client: ${clientName}`;
  switch (section.type) {
    case "cover":
      return `${base}\n\nWrite a short, compelling subtitle/tagline for this proposal's cover page. The proposal title is "${section.title}". ${userPrompt}`;
    case "text":
      return `${base}\n\nWrite the body content for a proposal section titled "${section.heading}". ${userPrompt ? `Instructions: ${userPrompt}` : "Write 2–3 compelling paragraphs."}`;
    case "terms":
      return `${base}\n\nWrite professional terms and conditions for this proposal. ${userPrompt ? `Instructions: ${userPrompt}` : "Include payment terms, revision policy, intellectual property, and cancellation clause. Use plain language."}`;
    case "services": {
      const count = (section as Extract<Section, { type: "services" }>).items.length || 3;
      return `${base}\n\nGenerate ${count} service items for this proposal's services section.\n\nReturn ONLY valid JSON array, no other text:\n[\n  {"icon": "🚀", "name": "Service Name", "description": "Short description"}\n]\n\n${userPrompt ? `Context: ${userPrompt}` : ""}`;
    }
    case "faq": {
      const count = (section as Extract<Section, { type: "faq" }>).items.length || 4;
      return `${base}\n\nGenerate ${count} FAQ items for this proposal.\n\nReturn ONLY valid JSON array, no other text:\n[\n  {"question": "Question?", "answer": "Answer."}\n]\n\n${userPrompt ? `Context: ${userPrompt}` : ""}`;
    }
    case "timeline": {
      const count = (section as Extract<Section, { type: "timeline" }>).steps.length || 4;
      return `${base}\n\nGenerate ${count} timeline steps for this proposal's process section.\n\nReturn ONLY valid JSON array, no other text:\n[\n  {"title": "Step Title", "description": "What happens in this step."}\n]\n\n${userPrompt ? `Context: ${userPrompt}` : ""}`;
    }
    default:
      return `${base}\n\n${userPrompt}`;
  }
}

function applyResult(section: Section, result: string): Section {
  switch (section.type) {
    case "cover":
      return { ...section, subtitle: result.trim() };
    case "text":
      return { ...section, body: result.trim() };
    case "terms":
      return { ...section, body: result.trim() };
    case "services": {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        const parsed: Array<{ icon?: string; name?: string; description?: string }> = JSON.parse(jsonMatch ? jsonMatch[0] : result);
        const items: ServiceItem[] = parsed.map((p) => ({ id: uid(), icon: p.icon ?? "⭐", name: p.name ?? "", description: p.description ?? "" }));
        return { ...section, items };
      } catch { return { ...section, items: [{ id: uid(), icon: "⭐", name: "Service", description: result.trim() }] }; }
    }
    case "faq": {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        const parsed: Array<{ question?: string; answer?: string }> = JSON.parse(jsonMatch ? jsonMatch[0] : result);
        const items: FaqItem[] = parsed.map((p) => ({ id: uid(), question: p.question ?? "", answer: p.answer ?? "" }));
        return { ...section, items };
      } catch { return { ...section, items: [{ id: uid(), question: "Question?", answer: result.trim() }] }; }
    }
    case "timeline": {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        const parsed: Array<{ title?: string; description?: string }> = JSON.parse(jsonMatch ? jsonMatch[0] : result);
        const steps: TimelineStep[] = parsed.map((p) => ({ id: uid(), title: p.title ?? "", description: p.description ?? "" }));
        return { ...section, steps };
      } catch { return { ...section, steps: [{ id: uid(), title: "Step", description: result.trim() }] }; }
    }
    default:
      return section;
  }
}

interface SectionAiPanelProps {
  section: Section;
  proposalTitle: string;
  clientName: string;
  onClose: () => void;
  onApply: (updated: Section) => void;
}

export function SectionAiPanel({ section, proposalTitle, clientName, onClose, onApply }: SectionAiPanelProps) {
  const [tone, setTone] = useState<Tone>("professional");
  const [userPrompt, setUserPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);

  const isStructured = section.type === "services" || section.type === "faq" || section.type === "timeline";
  const sectionLabel = SECTION_LABELS[section.type] ?? section.type;

  const generate = async () => {
    setLoading(true);
    setError("");
    setApplied(false);
    try {
      const context = buildPrompt(section, proposalTitle, clientName, userPrompt);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "section_content", context, tone }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate");
        return;
      }
      const data = await res.json();
      setResult(data.result ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const updated = applyResult(section, result);
    onApply(updated);
    setApplied(true);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-background border-l shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-purple-50 dark:bg-purple-950/20">
        <div>
          <h2 className="font-semibold text-sm text-purple-900 dark:text-purple-100">Claude AI — {sectionLabel}</h2>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">Generate content for this section</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tone */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Tone</p>
          <div className="flex gap-1">
            {(["professional", "friendly", "concise"] as Tone[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors capitalize ${
                  tone === t
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-border text-muted-foreground hover:border-purple-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {isStructured ? "What should the content be about?" : "Additional instructions (optional)"}
          </p>
          <textarea
            rows={3}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={
              section.type === "services" ? "e.g. SEO, social media, web design..." :
              section.type === "faq" ? "e.g. pricing, timeline, revisions..." :
              section.type === "timeline" ? "e.g. discovery, design, build, launch..." :
              section.type === "terms" ? "e.g. include 50% deposit, net-30 payment terms..." :
              "e.g. focus on ROI and measurable results..."
            }
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 placeholder:text-muted-foreground"
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : "Generate with Claude"}
        </Button>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {result && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {isStructured ? "Preview (JSON — will be parsed into items)" : "Generated content"}
            </p>
            <textarea
              rows={isStructured ? 10 : 8}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-xs bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="flex-1">
                <RefreshCw className="h-3 w-3 mr-1" />Regenerate
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!result.trim() || applied}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {applied ? <><Check className="h-3 w-3 mr-1" />Applied!</> : "Apply to Section"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
