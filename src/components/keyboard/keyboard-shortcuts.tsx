"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard } from "lucide-react";

export interface NavShortcut {
  key: string;   // second key after "g"
  label: string;
  href: string;
}

interface Props {
  navShortcuts: NavShortcut[];
}

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

// Global keyboard navigation. "g" then a key jumps to a section; "?" opens the
// shortcut cheat sheet. Ignores keystrokes while typing in a field.
export function KeyboardShortcuts({ navShortcuts }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      // "?" (Shift+/) toggles the cheat sheet.
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === "Escape" && open) { setOpen(false); return; }

      // Two-key "g <x>" navigation sequence.
      if (gPending.current) {
        const match = navShortcuts.find((s) => s.key.toLowerCase() === e.key.toLowerCase());
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        if (match) { e.preventDefault(); router.push(match.href); }
        return;
      }
      if (e.key === "g" || e.key === "G") {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gPending.current = false; }, 1200);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [navShortcuts, router, open]);

  if (!open) return null;

  const globalShortcuts = [
    { keys: "/", label: "Focus search" },
    { keys: "Shift + S", label: "Toggle notifications" },
    { keys: "?", label: "Show this help" },
    { keys: "Esc", label: "Close menus & dialogs" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Keyboard shortcuts</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Go to</h3>
            <ul className="space-y-1.5">
              {navShortcuts.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Kbd>g</Kbd><span className="text-muted-foreground text-xs">then</span><Kbd>{s.key}</Kbd>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">General</h3>
            <ul className="space-y-1.5">
              {globalShortcuts.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <Kbd>{s.keys}</Kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[11px] font-mono text-foreground shrink-0">
      {children}
    </kbd>
  );
}
