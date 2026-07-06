"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Field { id: string; label: string; type: string; required: boolean; options?: string[]; mapTo?: string; }
interface Form { id: string; name: string; fields: Field[]; submitLabel: string; successMessage: string; redirectUrl: string | null; accentColor: string; }

export default function EmbedFormPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/forms/${id}`).then((r) => r.json()).then((d) => { if (d.form) setForm(d.form); });
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending"); setError("");
    const r = await fetch(`/api/public/forms/${id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: values }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Something went wrong."); setStatus("error"); return; }
    if (d.redirectUrl) { window.location.href = d.redirectUrl; return; }
    setStatus("done");
  };

  if (!form) return <div style={{ padding: 24, fontFamily: "system-ui", color: "#666" }}>Loading…</div>;
  const accent = form.accentColor || "#0d9488";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 20, maxWidth: 460, margin: "0 auto", color: "#111" }}>
      <style>{`
        .lf-in{width:100%;padding:10px 12px;border:1px solid #d5dbd9;border-radius:8px;font-size:15px;box-sizing:border-box;font-family:inherit}
        .lf-in:focus{outline:2px solid ${accent}55;border-color:${accent}}
        .lf-lb{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:#243}
        .lf-row{margin-bottom:14px}
        .lf-btn{width:100%;padding:12px;border:0;border-radius:8px;background:${accent};color:#fff;font-size:15px;font-weight:600;cursor:pointer}
        .lf-btn:disabled{opacity:.6}
        @media (prefers-color-scheme: dark){body{background:#0b1413}div{color:#e6efec}.lf-lb{color:#cfe}.lf-in{background:#12201e;border-color:#243;color:#e6efec}}
      `}</style>
      {status === "done" ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: accent, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>✓</div>
          <p style={{ fontSize: 16 }}>{form.successMessage}</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          {form.fields.map((f) => (
            <div className="lf-row" key={f.id}>
              <label className="lf-lb">{f.label}{f.required && " *"}</label>
              {f.type === "textarea" ? (
                <textarea className="lf-in" rows={3} required={f.required} value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />
              ) : f.type === "select" ? (
                <select className="lf-in" required={f.required} value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}>
                  <option value="">Select…</option>
                  {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="lf-in" type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"} required={f.required} value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />
              )}
            </div>
          ))}
          {error && <p style={{ color: "#c0392b", fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button className="lf-btn" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : form.submitLabel}</button>
        </form>
      )}
    </div>
  );
}
