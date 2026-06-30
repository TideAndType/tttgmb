"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<any>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (sessionStorage.getItem("pwa-dismissed")) { setDismissed(true); return; }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) return; // already installed

    // Android/Chrome/desktop: capture the install prompt event.
    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari doesn't support beforeinstallprompt — show manual instructions.
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIOS && !/crios|fxios|edgios/.test(ua);
    if (isIOS && isSafari) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem("pwa-dismissed", "1"); } catch { /* ignore */ }
  };

  if (dismissed || (!deferred && !iosHint)) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-[60] rounded-xl border border-border bg-card shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Install the app</p>
          {deferred ? (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">Add this portal to your home screen for a fullscreen, app-like experience.</p>
              <button onClick={install} className="mt-3 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 hover:opacity-90 transition-opacity">
                Install
              </button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share className="h-3.5 w-3.5 inline" /> <span className="font-medium">Share</span>, then <span className="font-medium">“Add to Home Screen”</span>.
            </p>
          )}
        </div>
        <button onClick={close} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
