"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Check } from "lucide-react";

type Form = Record<string, string>;

const FIELDS: { key: string; label: string; area?: boolean; placeholder?: string }[] = [
  { key: "companyName", label: "Business name" },
  { key: "website", label: "Website URL", placeholder: "https://…" },
  { key: "industry", label: "Industry" },
  { key: "services", label: "Services", area: true, placeholder: "What you offer" },
  { key: "locations", label: "Locations / service areas", area: true },
  { key: "targetAudience", label: "Target audience", area: true, placeholder: "Who you serve" },
  { key: "brandVoice", label: "Brand voice", area: true, placeholder: "e.g. friendly, expert, concise" },
  { key: "competitors", label: "Competitors", area: true, placeholder: "One per line" },
  { key: "socialAccounts", label: "Social accounts", area: true },
  { key: "goals", label: "Marketing goals", area: true },
  { key: "faqs", label: "Common FAQs", area: true },
  { key: "extraNotes", label: "Anything else the AI should know", area: true },
];

export default function MarketingSetupPage() {
  const [form, setForm] = useState<Form>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/profile").then((r) => r.json()).then((d) => {
      const p = d.profile || {};
      const f: Form = {};
      FIELDS.forEach(({ key }) => { f[key] = p[key] ?? ""; });
      setForm(f);
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    await fetch("/api/marketing/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/marketing" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Marketing OS</Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
        <p className="text-sm text-muted-foreground">The more the AI knows, the better its briefings, tasks, and content. This powers your whole Marketing OS.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">About your business</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              {f.area ? (
                <Textarea value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} rows={2} placeholder={f.placeholder} />
              ) : (
                <Input value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              )}
            </div>
          ))}
          <Button onClick={save} disabled={saving}>
            {saved ? <Check className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
