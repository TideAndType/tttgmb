"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ClipboardList, Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Field { id: string; label: string; type: string; required: boolean; options: string[]; }
interface FormSummary { id: string; title: string; description: string | null; active: boolean; _count: { responses: number }; }
interface Response { id: string; userId: string; answers: Record<string, string>; submittedAt: string; responderName: string; }
interface FormDetail extends FormSummary { fields: Field[]; responses: Response[]; }

export default function AdminFormsPage() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([{ id: "f0", label: "", type: "text", required: true, options: [] }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<FormDetail | null>(null);

  const load = () => {
    fetch("/api/intake-forms").then((r) => r.json()).then((d) => setForms(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const addField = () => setFields((p) => [...p, { id: `f${Date.now()}`, label: "", type: "text", required: false, options: [] }]);
  const updateField = (id: string, patch: Partial<Field>) => setFields((p) => p.map((f) => f.id === id ? { ...f, ...patch } : f));
  const removeField = (id: string) => setFields((p) => p.filter((f) => f.id !== id));

  const create = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/intake-forms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, fields }),
    });
    setSaving(false);
    if (res.ok) {
      setTitle(""); setDescription(""); setFields([{ id: "f0", label: "", type: "text", required: true, options: [] }]);
      setShowBuilder(false); load();
    } else {
      const d = await res.json(); setError(d.error || "Failed to create form");
    }
  };

  const toggleActive = async (f: FormSummary) => {
    const res = await fetch(`/api/intake-forms/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !f.active }) });
    if (res.ok) setForms((p) => p.map((x) => x.id === f.id ? { ...x, active: !x.active } : x));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this form and all responses?")) return;
    const res = await fetch(`/api/intake-forms/${id}`, { method: "DELETE" });
    if (res.ok) setForms((p) => p.filter((x) => x.id !== id));
  };

  const expand = async (id: string) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id); setDetail(null);
    const res = await fetch(`/api/intake-forms/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Intake Forms</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create questionnaires for clients to complete.</p>
        </div>
        {!showBuilder && <Button onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4 mr-2" />New Form</Button>}
      </div>

      {showBuilder && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Form</CardTitle><CardDescription>Active forms appear to all clients until they respond.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project Brief Questionnaire" /></div>
            <div className="space-y-2"><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Help us understand your goals" /></div>
            <div className="space-y-3">
              <Label>Fields</Label>
              {fields.map((f) => (
                <div key={f.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="Question label" className="flex-1" />
                    <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value })} className="border border-input rounded-md px-2 py-2 text-sm bg-background">
                      <option value="text">Short text</option>
                      <option value="textarea">Long text</option>
                      <option value="select">Dropdown</option>
                    </select>
                    <button onClick={() => removeField(f.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                  {f.type === "select" && (
                    <Input
                      value={f.options.join(", ")}
                      onChange={(e) => updateField(f.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                      placeholder="Comma-separated options: Option A, Option B"
                      className="text-sm"
                    />
                  )}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} /> Required
                  </label>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" />Add field</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving || !title.trim()}>{saving ? "Saving..." : "Create Form"}</Button>
              <Button variant="outline" onClick={() => { setShowBuilder(false); setError(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : forms.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No forms yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => expand(f.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                    {expanded === f.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f._count.responses} response{f._count.responses !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(f)} className={`text-xs px-2 py-1 rounded-md border ${f.active ? "border-green-300 text-green-600" : "border-border text-muted-foreground"}`}>{f.active ? "Active" : "Inactive"}</button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                {expanded === f.id && detail && detail.id === f.id && (
                  <div className="mt-4 border-t border-border pt-4 space-y-4">
                    {detail.responses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No responses yet.</p>
                    ) : detail.responses.map((r) => (
                      <div key={r.id} className="rounded-lg bg-muted/40 p-3">
                        <p className="text-sm font-medium text-foreground mb-2">{r.responderName} <span className="text-xs font-normal text-muted-foreground">· {new Date(r.submittedAt).toLocaleDateString()}</span></p>
                        <dl className="space-y-1.5">
                          {detail.fields.map((field) => (
                            <div key={field.id} className="text-sm">
                              <dt className="text-xs text-muted-foreground">{field.label}</dt>
                              <dd className="text-foreground whitespace-pre-wrap">{r.answers[field.id] || <span className="text-muted-foreground italic">—</span>}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
