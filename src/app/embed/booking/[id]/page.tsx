"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DaySlots { date: string; label: string; slots: string[]; }
interface Cal { id: string; name: string; description: string | null; durationMin: number; timezone: string; accentColor: string; successMessage: string; }

export default function EmbedBookingPage() {
  const { id } = useParams<{ id: string }>();
  const [cal, setCal] = useState<Cal | null>(null);
  const [days, setDays] = useState<DaySlots[]>([]);
  const [sel, setSel] = useState<{ date: string; time: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const load = () => fetch(`/api/public/booking/${id}`).then((r) => r.json()).then((d) => { if (d.calendar) { setCal(d.calendar); setDays(d.days || []); } });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setStatus("sending"); setError("");
    const r = await fetch(`/api/public/booking/${id}/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...sel, ...form }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Couldn't book."); setStatus("error"); if (r.status === 409) load(); return; }
    setStatus("done");
  };

  if (!cal) return <div style={{ padding: 24, fontFamily: "system-ui", color: "#666" }}>Loading…</div>;
  const accent = cal.accentColor || "#0d9488";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 20, maxWidth: 520, margin: "0 auto", color: "#111" }}>
      <style>{`
        .bk-in{width:100%;padding:10px 12px;border:1px solid #d5dbd9;border-radius:8px;font-size:15px;box-sizing:border-box;font-family:inherit}
        .bk-lb{display:block;font-size:13px;font-weight:600;margin:0 0 5px}
        .bk-slot{border:1px solid #d5dbd9;background:#fff;border-radius:8px;padding:8px 6px;font-size:13px;cursor:pointer}
        .bk-slot.on{background:${accent};color:#fff;border-color:${accent}}
        .bk-btn{width:100%;padding:12px;border:0;border-radius:8px;background:${accent};color:#fff;font-size:15px;font-weight:600;cursor:pointer}
        .bk-btn:disabled{opacity:.6}
        @media (prefers-color-scheme: dark){body{background:#0b1413}div{color:#e6efec}.bk-in,.bk-slot{background:#12201e;border-color:#243;color:#e6efec}}
      `}</style>

      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{cal.name}</h2>
      <p style={{ margin: "0 0 4px", color: "#667", fontSize: 14 }}>{cal.durationMin} min{cal.description ? ` · ${cal.description}` : ""}</p>
      <p style={{ margin: "0 0 16px", color: "#8a9", fontSize: 12 }}>Times shown in {cal.timezone}</p>

      {status === "done" ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: accent, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>✓</div>
          <p style={{ fontSize: 16 }}>{cal.successMessage}</p>
        </div>
      ) : !sel ? (
        days.length === 0 ? <p style={{ color: "#889" }}>No times available right now.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {days.map((d) => (
              <div key={d.date}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>{d.label}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
                  {d.slots.map((t) => <button key={t} className="bk-slot" onClick={() => setSel({ date: d.date, time: t })}>{t}</button>)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <form onSubmit={book}>
          <button type="button" onClick={() => setSel(null)} style={{ background: "none", border: 0, color: accent, cursor: "pointer", padding: 0, marginBottom: 12, fontSize: 14 }}>← Change time</button>
          <p style={{ fontWeight: 600, marginBottom: 14 }}>{days.find((d) => d.date === sel.date)?.label} at {sel.time}</p>
          <div style={{ marginBottom: 12 }}><label className="bk-lb">Name *</label><input className="bk-in" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div style={{ marginBottom: 12 }}><label className="bk-lb">Email *</label><input className="bk-in" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div style={{ marginBottom: 12 }}><label className="bk-lb">Phone</label><input className="bk-in" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div style={{ marginBottom: 14 }}><label className="bk-lb">Anything we should know?</label><textarea className="bk-in" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          {error && <p style={{ color: "#c0392b", fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button className="bk-btn" type="submit" disabled={status === "sending"}>{status === "sending" ? "Booking…" : "Confirm booking"}</button>
        </form>
      )}
    </div>
  );
}
