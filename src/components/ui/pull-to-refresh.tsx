"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Touch pull-to-refresh. Engages only when the nearest scroll container is at
// the top and the user drags down. Desktop/mouse is unaffected.
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const THRESHOLD = 64;

  const scrollParent = (): HTMLElement | null => {
    let el = wrap.current?.parentElement || null;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  };

  const onStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const sp = scrollParent();
    if (sp && sp.scrollTop > 2) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  };
  const onMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    setPull(Math.min(THRESHOLD * 1.4, dy * 0.5));
  };
  const onEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true); setPull(THRESHOLD);
      try { await onRefresh(); } finally { setRefreshing(false); setPull(0); }
    } else {
      setPull(0);
    }
  };

  const active = pull > 0 || refreshing;
  return (
    <div ref={wrap} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-muted-foreground"
        style={{ height: active ? Math.max(pull, refreshing ? 40 : 0) : 0, transition: startY.current ? "none" : "height .2s ease-out" }}
      >
        <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)`, opacity: Math.min(1, pull / THRESHOLD) }} />
      </div>
      <div style={{ transform: `translateY(${active && !refreshing ? pull * 0.3 : 0}px)`, transition: startY.current ? "none" : "transform .2s ease-out" }}>
        {children}
      </div>
    </div>
  );
}
