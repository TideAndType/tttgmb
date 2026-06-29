import type { CSSProperties } from "react";

export interface SectionSettings {
  bgColor?: string;
  bgImage?: string;
  paddingY?: number; // px, overrides default vertical padding
  maxWidth?: "narrow" | "normal" | "wide" | "full";
  align?: "left" | "center" | "right";
  hidden?: boolean;
}

// Returns wrapper style + helper classes for a section based on its settings.
export function sectionWrapper(settings?: SectionSettings): {
  style: CSSProperties;
  alignClass: string;
  innerClass: string;
  hasInner: boolean;
} {
  const s = settings || {};
  const style: CSSProperties = {};
  if (s.bgColor) style.backgroundColor = s.bgColor;
  if (s.bgImage) {
    style.backgroundImage = `url("${s.bgImage}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (typeof s.paddingY === "number") {
    style.paddingTop = s.paddingY;
    style.paddingBottom = s.paddingY;
  }
  const alignClass = s.align === "center" ? "text-center" : s.align === "right" ? "text-right" : "";
  const innerClass =
    s.maxWidth === "narrow" ? "max-w-2xl mx-auto"
    : s.maxWidth === "wide" ? "max-w-5xl mx-auto"
    : s.maxWidth === "full" ? "w-full"
    : "";
  return { style, alignClass, innerClass, hasInner: !!innerClass };
}
