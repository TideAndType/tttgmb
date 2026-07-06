"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Search, KanbanSquare, Mail, Phone, Building2 } from "lucide-react";

interface Contact {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  status: string; source: string | null; _count?: { opportunities: number };
}

const STATUS: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-600", qualified: "bg-amber-500/10 text-amber-600",
  customer: "bg-green-500/10 text-green-600", lost: "bg-muted text-muted-foreground",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "", status: "lead" });

  const load = async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter) params.set("status", filter);
    const d = await fetch(`/api/crm/contacts?${params}`).then((r) => r.json());
    setContacts(d.contacts ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  const add = async () => {
    if (!form.name.trim()) return;
    const r = await fetch("/api/crm/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { setForm({ name: "", email: "", phone: "", company: "", source: "", status: "lead" }); setAdding(false); load(); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground">Your leads and customers.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm"><Button size="sm" variant="outline"><KanbanSquare className="h-4 w-4 mr-1.5" /> Pipeline</Button></Link>
          <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4 mr-1.5" /> Add contact</Button>
        </div>
      </div>

      {adding && (
        <Card><CardHeader><CardTitle className="text-base">New contact</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name *" />
            <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company" />
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" />
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
            <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Source (e.g. Website, Referral)" />
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
              {["lead", "qualified", "customer", "lost"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="sm:col-span-2"><Button onClick={add} disabled={!form.name.trim()}>Add contact</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["", "lead", "qualified", "customer", "lost"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-xs border capitalize ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{s || "all"}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : contacts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No contacts yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Link key={c.id} href={`/crm/contacts/${c.id}`} className="block rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{c.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${STATUS[c.status] || ""}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {c.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company}</span>}
                    {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                </div>
                {(c._count?.opportunities ?? 0) > 0 && <span className="text-xs text-muted-foreground shrink-0">{c._count!.opportunities} deal{c._count!.opportunities !== 1 ? "s" : ""}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
