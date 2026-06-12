"use client";

import { Block, LayoutSection, Selection, TextAlign, BLOCK_LABELS } from "./layout-types";

type Props = {
  selection: Selection | null;
  section: LayoutSection | null;
  block: Block | null;
  onUpdateSection: (patch: Partial<LayoutSection>) => void;
  onUpdateBlock: (patch: Partial<Block>) => void;
};

function ColorDot({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer" title={label}>
      <input type="color" value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-full cursor-pointer border border-gray-200 shrink-0 p-0" />
      <span className="text-xs text-gray-500 hidden sm:block">{label}</span>
    </label>
  );
}

function Btn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button title={title} onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${active ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
      {children}
    </button>
  );
}

function AlignButtons({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  return (
    <div className="flex gap-0.5">
      {(["left","center","right"] as TextAlign[]).map((a) => (
        <button key={a} onClick={() => onChange(a)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${value === a ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
          title={`Align ${a}`}>
          {a === "left" ? "≡" : a === "center" ? "≡" : "≡"}
          <span className="sr-only">{a}</span>
          {a === "left" ? "L" : a === "center" ? "C" : "R"}
        </button>
      ))}
    </div>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />;
}

export function PropertiesBar({ selection, section, block, onUpdateSection, onUpdateBlock }: Props) {
  if (!selection) return null;

  if (selection.kind === "section" && section) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card text-sm overflow-x-auto shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Section</span>
        <Separator />
        {/* Column layout preset buttons */}
        <span className="text-xs text-gray-500 shrink-0">Columns:</span>
        {([
          ["1", [1]], ["2", [1,1]], ["3", [1,1,1]], ["4", [1,1,1,1]],
          ["⅔ | ⅓", [2,1]], ["⅓ | ⅔", [1,2]],
        ] as const).map(([label, fractions]) => {
          const active = section.columns.length === fractions.length &&
            section.columns.every((c, i) => c.widthFr === (fractions as unknown as number[])[i]);
          return (
            <button key={label} onClick={() => {
              const f = fractions as unknown as number[];
              const newCols = f.map((fr, i) => ({
                id: section.columns[i]?.id ?? `col-${i}`,
                blocks: section.columns[i]?.blocks ?? [],
                widthFr: fr,
              }));
              onUpdateSection({ columns: newCols });
            }}
              className={`px-2 py-1 rounded text-xs border transition-colors shrink-0 ${active ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
              {label}
            </button>
          );
        })}
        <Separator />
        <ColorDot label="Bg Color" value={section.bgColor || "#ffffff"}
          onChange={(v) => onUpdateSection({ bgColor: v === "#ffffff" ? undefined : v })} />
        <Separator />
        <span className="text-xs text-gray-500 shrink-0">Video URL:</span>
        <input value={section.bgVideo || ""} onChange={(e) => onUpdateSection({ bgVideo: e.target.value || undefined })} placeholder="YouTube or Vimeo…" className="w-52 text-xs border border-gray-200 rounded px-2 py-1 shrink-0" />
        <Separator />
        <span className="text-xs text-gray-500 shrink-0">Padding:</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">↑</span>
          <input type="number" min={0} max={200} step={8} value={section.paddingTop ?? 48}
            onChange={(e) => onUpdateSection({ paddingTop: Number(e.target.value) })}
            className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
          <span className="text-xs text-gray-400">↓</span>
          <input type="number" min={0} max={200} step={8} value={section.paddingBottom ?? 48}
            onChange={(e) => onUpdateSection({ paddingBottom: Number(e.target.value) })}
            className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
        </div>
      </div>
    );
  }

  if (selection.kind === "block" && block) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card text-sm overflow-x-auto shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          {BLOCK_LABELS[block.type]}
        </span>
        <Separator />

        {block.type === "heading" && (
          <>
            <span className="text-xs text-gray-500 shrink-0">Size:</span>
            {([1,2,3] as const).map((l) => (
              <Btn key={l} active={block.level === l} onClick={() => onUpdateBlock({ level: l } as any)} title={`H${l}`}>H{l}</Btn>
            ))}
            <Separator />
            <AlignButtons value={block.align} onChange={(v) => onUpdateBlock({ align: v } as any)} />
            <Separator />
            <ColorDot label="Color" value={block.color || "#111827"} onChange={(v) => onUpdateBlock({ color: v } as any)} />
          </>
        )}

        {block.type === "paragraph" && (
          <>
            <AlignButtons value={block.align} onChange={(v) => onUpdateBlock({ align: v } as any)} />
            <Separator />
            <ColorDot label="Color" value={block.color || "#374151"} onChange={(v) => onUpdateBlock({ color: v } as any)} />
          </>
        )}

        {block.type === "button" && (
          <>
            <span className="text-xs text-gray-500 shrink-0">Label:</span>
            <input value={block.label} onChange={(e) => onUpdateBlock({ label: e.target.value } as any)}
              className="w-28 text-xs border border-gray-200 rounded px-2 py-1" placeholder="Button text" />
            <span className="text-xs text-gray-500 shrink-0">URL:</span>
            <input value={block.url} onChange={(e) => onUpdateBlock({ url: e.target.value } as any)}
              className="w-40 text-xs border border-gray-200 rounded px-2 py-1" placeholder="https://..." />
            <Separator />
            <Btn active={block.variant === "filled"}  onClick={() => onUpdateBlock({ variant: "filled" }  as any)}>Filled</Btn>
            <Btn active={block.variant === "outline"} onClick={() => onUpdateBlock({ variant: "outline" } as any)}>Outline</Btn>
            <Separator />
            <AlignButtons value={block.align} onChange={(v) => onUpdateBlock({ align: v } as any)} />
            <Separator />
            <ColorDot label="Text"       value={block.color   || "#ffffff"} onChange={(v) => onUpdateBlock({ color:   v } as any)} />
            <ColorDot label="Background" value={block.bgColor || "#2563eb"} onChange={(v) => onUpdateBlock({ bgColor: v } as any)} />
          </>
        )}

        {block.type === "image" && (
          <>
            <span className="text-xs text-gray-500 shrink-0">URL:</span>
            <input value={block.url} onChange={(e) => onUpdateBlock({ url: e.target.value } as any)}
              className="w-56 text-xs border border-gray-200 rounded px-2 py-1" placeholder="https://..." />
            <Separator />
            <span className="text-xs text-gray-500 shrink-0">Radius:</span>
            <input type="number" min={0} max={999} value={block.borderRadius ?? 8}
              onChange={(e) => onUpdateBlock({ borderRadius: Number(e.target.value) } as any)}
              className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
          </>
        )}

        {block.type === "spacer" && (
          <>
            <span className="text-xs text-gray-500 shrink-0">Height (px):</span>
            <input type="number" min={4} max={400} step={4} value={block.height}
              onChange={(e) => onUpdateBlock({ height: Number(e.target.value) } as any)}
              className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 text-center" />
          </>
        )}

        {block.type === "divider" && (
          <>
            <ColorDot label="Color" value={block.color || "#e5e7eb"} onChange={(v) => onUpdateBlock({ color: v } as any)} />
          </>
        )}

        {block.type === "list" && (
          <>
            <span className="text-xs text-gray-500 shrink-0">Style:</span>
            {(["bullet","numbered","check"] as const).map((s) => (
              <Btn key={s} active={block.listStyle === s} onClick={() => onUpdateBlock({ listStyle: s } as any)}>
                {s === "bullet" ? "•" : s === "numbered" ? "1." : "✓"} {s}
              </Btn>
            ))}
            <Separator />
            <ColorDot label="Color" value={block.color || "#374151"} onChange={(v) => onUpdateBlock({ color: v } as any)} />
          </>
        )}

        {block.type === "quote" && (
          <>
            <span className="text-xs text-muted-foreground">Click quote text to edit content</span>
          </>
        )}
      </div>
    );
  }

  return null;
}
