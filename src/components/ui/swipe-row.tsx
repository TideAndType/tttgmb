"use client";

import { useRef, useState } from "react";

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  className: string; // background/text classes
  onAction: () => void;
}

// Touch swipe-left to reveal actions behind a list row (native-app pattern).
// Desktop (mouse) is unaffected. Suppresses the row's click after a swipe.
export function SwipeRow({ children, actions }: { children: React.ReactNode; actions: SwipeAction[] }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);
  const openWidth = actions.length * 72;

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiping.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const mx = e.touches[0].clientX - start.current.x;
    const my = e.touches[0].clientY - start.current.y;
    if (!swiping.current && Math.abs(mx) < 12) return;
    if (Math.abs(my) > Math.abs(mx)) return; // vertical scroll wins
    swiping.current = true;
    const base = dx < 0 ? -openWidth : 0;
    setDx(Math.max(-openWidth, Math.min(0, base + mx)));
  };
  const onTouchEnd = () => {
    start.current = null;
    setDx((d) => (d < -openWidth / 2 ? -openWidth : 0));
    // Let the click-suppression flag survive the synthetic click that follows.
    setTimeout(() => { swiping.current = false; }, 80);
  };
  const suppressClick = (e: React.MouseEvent) => {
    if (swiping.current || dx !== 0) { e.preventDefault(); e.stopPropagation(); if (dx !== 0 && !swiping.current) setDx(0); }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => { setDx(0); try { navigator.vibrate?.(12); } catch { /* no haptics */ } a.onAction(); }}
            className={`w-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold active:opacity-80 transition-opacity ${a.className}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClickCapture={suppressClick}
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform .18s ease-out" }}
        className="relative bg-background"
      >
        {children}
      </div>
    </div>
  );
}
