"use client";

import { useEffect } from "react";

// Mobile-first bottom sheet (centered card on desktop). Slide-up animation,
// backdrop dismiss, body scroll lock, iOS safe-area padding.
export function BottomSheet({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-in w-full sm:max-w-md bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        {title && <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
