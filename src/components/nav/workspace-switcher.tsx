"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronsUpDown, Building2, Plus, Settings, ShieldCheck, Search, Check, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
}

interface WorkspaceSwitcherProps {
  agencyName: string;
  logoFilename: string | null;
}

/**
 * GoHighLevel-style workspace switcher: Main Admin → Agency → Client.
 * Selecting a client enters that client's workspace via impersonation (no logout,
 * context remembered in the adminViewingAs cookie). The "Agency" entry exits back.
 */
export function WorkspaceSwitcher({ agencyName, logoFilename }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    if (loaded) return;
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(Array.isArray(data) ? data.filter((c) => c.role === "CLIENT") : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [loaded]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const enterClient = async (client: Client) => {
    setSwitching(client.id);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    setSwitching(null);
    setOpen(false);
    if (res.ok) {
      // Instant context switch — no logout, no full reload.
      router.push("/dashboard");
      router.refresh();
    }
  };

  const goAgency = () => { setOpen(false); router.push("/admin"); };

  const filtered = clients.filter((c) => {
    const label = (c.companyName || c.name || "").toLowerCase();
    return label.includes(query.toLowerCase());
  });

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className="w-full flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left hover:bg-accent transition-colors"
      >
        {logoFilename ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/uploads/${logoFilename}`} alt="" className="h-6 w-6 rounded object-contain flex-shrink-0" />
        ) : (
          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Agency</p>
          <p className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">{agencyName}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[70vh]"
        >
          {role === "SUPER_ADMIN" && (
            <button
              onClick={() => { setOpen(false); router.push("/super-admin"); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent border-b border-border"
            >
              <ShieldCheck className="h-4 w-4 text-violet-500" /> Platform Admin
            </button>
          )}

          {/* Current: Agency */}
          <button onClick={goAgency} className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent border-b border-border">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Agency</p>
              <p className="text-sm font-medium text-foreground truncate">{agencyName}</p>
            </div>
            <Check className="h-4 w-4 text-primary" />
          </button>

          {/* Sub Accounts (clients) */}
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sub Accounts</span>
            <span className="text-[10px] text-muted-foreground">{clients.length}</span>
          </div>
          {clients.length > 6 && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search clients…"
                  className="w-full text-sm border border-input rounded-md pl-7 pr-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto flex-1 min-h-0">
            {!loaded ? (
              <p className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">{clients.length === 0 ? "No clients yet." : "No matches."}</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => enterClient(c)}
                  disabled={switching === c.id}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <div className="h-6 w-6 rounded bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium text-muted-foreground">
                    {(c.companyName || c.name || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground truncate flex-1">{c.companyName || c.name}</span>
                  {switching === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </button>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-border">
            <button onClick={() => { setOpen(false); router.push("/admin/clients/new"); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent">
              <Plus className="h-4 w-4 text-muted-foreground" /> Create Sub Account
            </button>
            <button onClick={() => { setOpen(false); router.push("/admin/settings"); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent">
              <Settings className="h-4 w-4 text-muted-foreground" /> Agency Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
