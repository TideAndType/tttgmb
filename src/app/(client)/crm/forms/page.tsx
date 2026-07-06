"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileInput, Plus, Trash2, Check, Copy, Inbox, KanbanSquare } from "lucide-react";

interface Field { id: string; label: string; type: string; required: boolean; mapTo?: string; options?: string[]; }
interface Submission { id: string; data: Record<string, string>; createdAt: string; }
interface Form {
  id: string; name: string; fields: Field[]; submitLabel: string; successMessage: string;
  redirectUrl: string | null; accentColor: string; createContact: boolean;
  _count?: { submissions: number }; submissions?: Submission[];
}

const TYPES = ["text", "email", "phone", "textarea", "select"];
const MAPS = [
  { v: "", l: "— none —" }, { v: "name", l: "Contact name" }, { v: "email", l: "Contact email" },
  { v: "phone", l: "Contact phone" }, { v: "company", l: "Company" },
];

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Form | null>(null);
  const [tab, setTab] = useState<"build" | "embed" | "submissions">("build");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); load(); }, []);
  const load = async () => { const d = await fetch("/api/forms-builder").then((r) => r.json()); setForms(d.forms ?? []); setLoading(false); };

  const create = async () => {
    const d = await fetch("/api/forms-builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Form" }) }).then((r) => r.json());
    setForms((p) => [d.form, ...p]); openEditor(d.form.id);
  };
  const openEditor = async (id: string) => { const d = await fetch(`/api/forms-builder/${id}`).then((r) => r.json()); setEditing(d.form); setTab("build"); };
  const save = async (f: Form) => { await fetch(`/api/forms-builder/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }); load(); };
  const remove = async (id: string) => { await fetch(`/api/forms-builder/${id}`, { method: "DELETE" }); setEditing(null); load(); };

  const setF = (p: Partial<Form>) => setEditing((e) => e ? { ...e, ...p } : e);
  const setField = (i: number, p: Partial<Field>) => setEditing((e) => e ? { ...e, fields: e.fields.map((f, idx) => idx === i ? { ...f, ...p } : f) } : e);
  const addField = () => setEditing((e) => e ? { ...e, fields: [...e.fields, { id: `f${Date.now()}`, label: "New field", type: "text", required: false }] } : e);
  const delField = (i: number) => setEditing((e) => e ? { ...e, fields: e.fields.filter((_, idx) => idx !== i) } : e);

  const snippet = editing ? `<iframe src="${origin}/embed/form/${editing.id}" style="width:100%;border:0;min-height:520px" title="${editing.name}"></iframe>` : "";

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">← All forms</button>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Input value={editing.name} onChange={(e) => setF({ name: e.target.value })} className="max-w-xs text-lg font-semibold" />
          <div className="flex gap-2">
            <Button onClick={() => save(editing)}>Save</Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(editing.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex gap-2">
          {(["build", "embed", "submissions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm border capitalize ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{t === "submissions" ? `Submissions (${editing.submissions?.length ?? 0})` : t}</button>
          ))}
        </div>

        {tab === "build" && (
          <Card><CardContent className="p-4 space-y-3">
            {editing.fields.map((f, i) => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 border border-border rounded-md p-2">
                <Input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Label" className="flex-1 min-w-[140px] h-8" />
                <select value={f.type} onChange={(e) => setField(i, { type: e.target.value })} className="border border-input rounded-md px-2 py-1 text-sm bg-background h-8">{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                <select value={f.mapTo || ""} onChange={(e) => setField(i, { mapTo: e.target.value })} className="border border-input rounded-md px-2 py-1 text-sm bg-background h-8" title="Map to CRM field">{MAPS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> required</label>
                <button onClick={() => delField(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addField}><Plus className="h-4 w-4 mr-1.5" /> Add field</Button>
            <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-border">
              <div><label className="text-xs text-muted-foreground">Submit button</label><Input value={editing.submitLabel} onChange={(e) => setF({ submitLabel: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Accent color</label><input type="color" value={editing.accentColor} onChange={(e) => setF({ accentColor: e.target.value })} className="h-10 w-16 rounded border border-border bg-background block" /></div>
              <div className="sm:col-span-2"><label className="text-xs text-muted-foreground">Success message</label><Input value={editing.successMessage} onChange={(e) => setF({ successMessage: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="text-xs text-muted-foreground">Redirect URL after submit (optional)</label><Input value={editing.redirectUrl ?? ""} onChange={(e) => setF({ redirectUrl: e.target.value })} placeholder="https://…" /></div>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={editing.createContact} onChange={(e) => setF({ createContact: e.target.checked })} /> Create a CRM contact on submit</label>
            </div>
          </CardContent></Card>
        )}

        {tab === "embed" && (
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Paste this snippet into any website to embed the form. Submissions arrive in your CRM automatically.</p>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
            <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />} Copy embed code</Button>
            <a href={`/embed/form/${editing.id}`} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline">Preview form ↗</a>
          </CardContent></Card>
        )}

        {tab === "submissions" && (
          <Card><CardContent className="p-4">
            {!editing.submissions?.length ? <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet.</p> : (
              <div className="space-y-2">
                {editing.submissions.map((s) => (
                  <div key={s.id} className="border border-border rounded-md p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">{new Date(s.createdAt).toLocaleString()}</p>
                    {Object.entries(s.data).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{editing.fields.find((f) => f.id === k)?.label || k}:</span> {String(v)}</div>)}
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileInput className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Forms</h1>
            <p className="text-sm text-muted-foreground">Build embeddable lead forms — submissions land in your CRM.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/crm"><Button size="sm" variant="outline"><KanbanSquare className="h-4 w-4 mr-1.5" /> Pipeline</Button></Link>
          <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1.5" /> New form</Button>
        </div>
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        : forms.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground"><FileInput className="h-8 w-8 mx-auto mb-2 opacity-40" />No forms yet.</CardContent></Card>
        : (
          <div className="space-y-2">
            {forms.map((f) => (
              <button key={f.id} onClick={() => openEditor(f.id)} className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors flex items-center justify-between">
                <div><p className="font-medium text-foreground">{f.name}</p><p className="text-xs text-muted-foreground">{f.fields.length} fields</p></div>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Inbox className="h-3.5 w-3.5" /> {f._count?.submissions ?? 0}</span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
