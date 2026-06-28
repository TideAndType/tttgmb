"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle } from "lucide-react";

interface Field { id: string; label: string; type: string; required: boolean; options: string[]; }
interface FormItem {
  id: string; title: string; description: string | null; fields: Field[];
  response: { id: string; answers: Record<string, string>; submittedAt: string } | null;
}

function FormCard({ form, onSubmitted }: { form: FormItem; onSubmitted: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>(form.response?.answers ?? {});
  const [editing, setEditing] = useState(!form.response);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(""); setSaving(true);
    const res = await fetch(`/api/intake-forms/${form.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); onSubmitted(); }
    else { const d = await res.json(); setError(d.error || "Failed to submit"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {form.title}
            {form.response && <CheckCircle className="h-4 w-4 text-green-500" />}
          </CardTitle>
          {form.response && !editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
        {form.description && <CardDescription>{form.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {form.fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</label>
            {!editing ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answers[f.id] || <span className="italic">—</span>}</p>
            ) : f.type === "textarea" ? (
              <textarea rows={3} value={answers[f.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [f.id]: e.target.value }))} className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            ) : f.type === "select" ? (
              <select value={answers[f.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [f.id]: e.target.value }))} className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground">
                <option value="">— Select —</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={answers[f.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [f.id]: e.target.value }))} className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
          </div>
        ))}
        {editing && (
          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving}>{saving ? "Submitting..." : form.response ? "Update" : "Submit"}</Button>
            {form.response && <Button variant="outline" onClick={() => { setAnswers(form.response!.answers); setEditing(false); }}>Cancel</Button>}
          </div>
        )}
        {form.response && !editing && (
          <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Submitted {new Date(form.response.submittedAt).toLocaleDateString()}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientFormsPage() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/intake-forms/pending").then((r) => r.json()).then((d) => setForms(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pending = forms.filter((f) => !f.response);
  const completed = forms.filter((f) => f.response);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forms</h1>
          <p className="text-muted-foreground mt-1">Questionnaires from your team</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : forms.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No forms to complete right now.</p></CardContent></Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-4">
              {pending.length > 0 && <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To complete</h2>}
              {pending.map((f) => <FormCard key={f.id} form={f} onSubmitted={load} />)}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</h2>
              {completed.map((f) => <FormCard key={f.id} form={f} onSubmitted={load} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
