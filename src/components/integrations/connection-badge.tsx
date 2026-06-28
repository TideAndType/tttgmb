"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ConnectionBadgeProps {
  service: "gsc" | "ga" | "gmb";
  label: string;
  /** called after a successful disconnect so the parent can refresh state */
  onDisconnected?: () => void;
}

/** "Connected ✓ · Disconnect" indicator for a Google integration. */
export function ConnectionBadge({ service, label, onDisconnected }: ConnectionBadgeProps) {
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    if (!confirm(`Disconnect ${label}? Data will stop syncing until reconnected.`)) return;
    setBusy(true);
    const res = await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    setBusy(false);
    if (res.ok) {
      onDisconnected?.();
    }
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span className="text-green-700 font-medium">Connected</span>
      <span className="text-green-300">·</span>
      <button onClick={disconnect} disabled={busy} className="text-green-700 hover:text-green-900 underline disabled:opacity-50 inline-flex items-center gap-1">
        {busy && <Loader2 className="h-3 w-3 animate-spin" />} Disconnect
      </button>
    </div>
  );
}
