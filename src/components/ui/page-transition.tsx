"use client";

import { usePathname } from "next/navigation";

// Re-mounts (via the pathname key) on every route change so the content
// fades/rises in — a subtle transition that makes navigation feel smoother.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
