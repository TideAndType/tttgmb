"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { hexToHsl } from "@/lib/utils";

interface BrandData {
  logoUrl: string | null;
  primaryColor: string | null;
  companyName: string | null;
}

const BrandContext = createContext<BrandData>({
  logoUrl: null,
  primaryColor: null,
  companyName: null,
});

export function useBrand() {
  return useContext(BrandContext);
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandData, setBrandData] = useState<BrandData>({
    logoUrl: null,
    primaryColor: null,
    companyName: null,
  });

  useEffect(() => {
    fetch("/api/brand/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch brand");
        return res.json();
      })
      .then((data: BrandData) => {
        setBrandData(data);
        if (data.primaryColor) {
          try {
            const hsl = hexToHsl(data.primaryColor);
            document.documentElement.style.setProperty("--primary", hsl);
            document.documentElement.style.setProperty("--ring", hsl);
          } catch {}
        }
      })
      .catch(() => {
        // Silently fail — default colors remain
      });
  }, []);

  return <BrandContext.Provider value={brandData}>{children}</BrandContext.Provider>;
}
