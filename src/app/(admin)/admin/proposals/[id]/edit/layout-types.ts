// Types for the flexible column layout section system

export type TextAlign = "left" | "center" | "right";

export type HeadingBlock   = { id: string; type: "heading";   text: string; level: 1|2|3; align: TextAlign; color?: string };
export type ParagraphBlock = { id: string; type: "paragraph"; text: string; align: TextAlign; color?: string };
export type ButtonBlock    = { id: string; type: "button";    label: string; url: string; variant: "filled"|"outline"; align: TextAlign; color?: string; bgColor?: string };
export type ImageBlock     = { id: string; type: "image";     url: string; alt?: string; borderRadius?: number; objectFit?: "cover"|"contain" };
export type DividerBlock   = { id: string; type: "divider";   color?: string };
export type SpacerBlock    = { id: string; type: "spacer";    height: number };
export type ListBlock      = { id: string; type: "list";      items: string[]; listStyle: "bullet"|"numbered"|"check"; color?: string };
export type QuoteBlock     = { id: string; type: "quote";     text: string; author?: string; role?: string };

export type Block =
  | HeadingBlock | ParagraphBlock | ButtonBlock | ImageBlock
  | DividerBlock | SpacerBlock | ListBlock | QuoteBlock;

export type Column = { id: string; blocks: Block[]; widthFr: number };

export type LayoutSection = {
  id: string;
  type: "layout";
  columns: Column[];
  bgColor?: string;
  bgVideo?: string;
  paddingTop?: number;
  paddingBottom?: number;
};

export type Selection =
  | { kind: "section"; sectionId: string }
  | { kind: "block"; sectionId: string; columnId: string; blockId: string };

export const BLOCK_LABELS: Record<Block["type"], string> = {
  heading: "Heading", paragraph: "Paragraph", button: "Button",
  image: "Image", divider: "Divider", spacer: "Spacer",
  list: "List", quote: "Quote",
};

export function makeColumn(widthFr = 1): Column {
  return { id: uid(), blocks: [], widthFr };
}

export function uid() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeBlock(type: Block["type"]): Block {
  const id = uid();
  switch (type) {
    case "heading":   return { id, type: "heading",   text: "New Heading",   level: 2, align: "left" };
    case "paragraph": return { id, type: "paragraph", text: "Start writing your content here.", align: "left" };
    case "button":    return { id, type: "button",    label: "Click Here", url: "#", variant: "filled", align: "left" };
    case "image":     return { id, type: "image",     url: "", alt: "", borderRadius: 8 };
    case "divider":   return { id, type: "divider" };
    case "spacer":    return { id, type: "spacer",    height: 32 };
    case "list":      return { id, type: "list",      items: ["Item one", "Item two", "Item three"], listStyle: "bullet" };
    case "quote":     return { id, type: "quote",     text: "An inspiring quote goes here.", author: "Author Name", role: "Title" };
  }
}

export function makeLayoutSection(preset: "1col"|"2col"|"3col"|"4col"|"wide-left"|"wide-right" = "1col"): LayoutSection {
  const id = uid();
  const colMap: Record<string, number[]> = {
    "1col": [1], "2col": [1,1], "3col": [1,1,1], "4col": [1,1,1,1],
    "wide-left": [2,1], "wide-right": [1,2],
  };
  const fractions = colMap[preset] ?? [1];
  return {
    id, type: "layout",
    columns: fractions.map((fr) => makeColumn(fr)),
    bgColor: undefined, paddingTop: 48, paddingBottom: 48,
  };
}
