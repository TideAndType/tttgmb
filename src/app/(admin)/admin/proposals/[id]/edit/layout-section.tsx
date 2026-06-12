"use client";

import { useRef, useState, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Block, Column, LayoutSection, Selection, makeBlock, uid,
  TextAlign, HeadingBlock, ParagraphBlock, ButtonBlock, QuoteBlock,
} from "./layout-types";
import {
  GripVertical, Plus, Trash2, Copy, Type, AlignLeft, Image as ImageIcon,
  SeparatorHorizontal, Minus, List, Quote, Pointer,
} from "lucide-react";

// ─── Editable text helper ────────────────────────────────────────────────────

function EditableText({
  blockId, value, onChange, tag = "div", className = "", placeholder = "", singleLine = false, style,
}: {
  blockId: string; value: string; onChange: (v: string) => void;
  tag?: keyof JSX.IntrinsicElements; className?: string; placeholder?: string; singleLine?: boolean; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const composing = useRef(false);
  const prevId = useRef(blockId);
  if (prevId.current !== blockId && ref.current) {
    ref.current.innerText = value ?? "";
    prevId.current = blockId;
  }
  const Tag = tag as any;
  return (
    <Tag ref={ref} contentEditable suppressContentEditableWarning
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(e: any) => { composing.current = false; onChange(e.currentTarget.innerText); }}
      onInput={(e: any) => { if (!composing.current) onChange(e.currentTarget.innerText); }}
      onKeyDown={(e: any) => {
        if (singleLine && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
      }}
      className={`outline-none cursor-text ${className}`}
      data-placeholder={placeholder}
      style={style}
      suppressHydrationWarning
    />
  );
}

// ─── Block renderers ─────────────────────────────────────────────────────────

function BlockView({ block, onUpdate }: { block: Block; onUpdate: (patch: Partial<Block>) => void }) {
  const alignClass = (a: TextAlign) => a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

  switch (block.type) {
    case "heading": {
      const sizes = { 1: "text-4xl", 2: "text-2xl", 3: "text-xl" } as const;
      const Tag = `h${block.level}` as "h1"|"h2"|"h3";
      return (
        <EditableText blockId={block.id} value={block.text}
          onChange={(v) => onUpdate({ text: v } as any)}
          tag={Tag} singleLine placeholder="Heading text"
          className={`wysiwyg-edit font-bold leading-tight ${sizes[block.level]} ${alignClass(block.align)}`}
          style={{ color: block.color } as any}
        />
      );
    }
    case "paragraph":
      return (
        <EditableText blockId={block.id} value={block.text}
          onChange={(v) => onUpdate({ text: v } as any)}
          tag="p" placeholder="Type your content..."
          className={`wysiwyg-edit leading-relaxed text-gray-700 whitespace-pre-wrap min-h-[1.5em] ${alignClass(block.align)}`}
          style={{ color: block.color } as any}
        />
      );
    case "button": {
      const wrapAlign = block.align === "center" ? "flex justify-center" : block.align === "right" ? "flex justify-end" : "";
      const filled = block.variant === "filled";
      return (
        <div className={wrapAlign}>
          <EditableText blockId={block.id} value={block.label}
            onChange={(v) => onUpdate({ label: v } as any)}
            tag="span" singleLine placeholder="Button label"
            className="wysiwyg-edit inline-block px-5 py-2.5 rounded-lg font-semibold text-sm cursor-text"
            style={{
              background: filled ? (block.bgColor || "#2563eb") : "transparent",
              color: block.color || (filled ? "#fff" : (block.bgColor || "#2563eb")),
              border: filled ? "none" : `2px solid ${block.bgColor || "#2563eb"}`,
            } as any}
          />
        </div>
      );
    }
    case "image":
      return block.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.url} alt={block.alt || ""} className="w-full object-cover"
          style={{ borderRadius: block.borderRadius ?? 8 }} />
      ) : (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
          <ImageIcon className="h-5 w-5 mr-2" /> Paste image URL in properties bar
        </div>
      );
    case "divider":
      return <hr style={{ borderColor: block.color || "#e5e7eb" }} className="border-t my-1" />;
    case "spacer":
      return <div style={{ height: block.height }} className="shrink-0" />;
    case "list": {
      const b = block as any;
      const check = block.listStyle === "check";
      const numbered = block.listStyle === "numbered";
      const Tag = numbered ? "ol" : "ul";
      return (
        <Tag className={`space-y-1 pl-5 ${numbered ? "list-decimal" : check ? "list-none" : "list-disc"}`}
          style={{ color: block.color || "#374151" }}>
          {block.items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {check && <span className="mr-2">✓</span>}
              <EditableText blockId={`${block.id}-${i}`} value={item}
                onChange={(v) => {
                  const items = [...block.items];
                  items[i] = v;
                  onUpdate({ items } as any);
                }}
                tag="span" singleLine placeholder="List item"
                className="wysiwyg-edit"
              />
            </li>
          ))}
          <li>
            <button onClick={() => onUpdate({ items: [...block.items, "New item"] } as any)}
              className="text-xs text-blue-400 hover:text-blue-600 mt-1">+ add item</button>
          </li>
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-gray-200 pl-4 py-2">
          <EditableText blockId={block.id} value={block.text}
            onChange={(v) => onUpdate({ text: v } as any)}
            tag="p" placeholder="Quote text..."
            className="wysiwyg-edit text-lg text-gray-700 italic leading-relaxed min-h-[1.5em]"
          />
          <div className="mt-2 text-sm text-gray-400">
            <EditableText blockId={`${block.id}-author`} value={block.author || ""}
              onChange={(v) => onUpdate({ author: v } as any)}
              tag="span" singleLine placeholder="Author name"
              className="wysiwyg-edit font-medium text-gray-600"
            />
            {" · "}
            <EditableText blockId={`${block.id}-role`} value={block.role || ""}
              onChange={(v) => onUpdate({ role: v } as any)}
              tag="span" singleLine placeholder="Title or company"
              className="wysiwyg-edit"
            />
          </div>
        </blockquote>
      );
    default:
      return null;
  }
}

// ─── Sortable block wrapper ───────────────────────────────────────────────────

const BLOCK_ICONS: Record<Block["type"], React.ElementType> = {
  heading: Type, paragraph: AlignLeft, button: Pointer, image: ImageIcon,
  divider: SeparatorHorizontal, spacer: Minus, list: List, quote: Quote,
};

function SortableBlock({
  block, isSelected, onSelect, onUpdate, onDuplicate, onDelete,
}: {
  block: Block; isSelected: boolean; onSelect: () => void;
  onUpdate: (p: Partial<Block>) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const Icon = BLOCK_ICONS[block.type] ?? Type;

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`group/block relative rounded-lg transition-all ${isSelected ? "ring-2 ring-blue-400 ring-offset-1" : "hover:ring-1 hover:ring-blue-200 hover:ring-offset-1"}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Block toolbar — appears on hover / selection */}
      <div className={`absolute -top-7 left-0 flex items-center gap-0.5 bg-blue-600 text-white rounded-t-md px-1.5 py-0.5 z-10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"}`}>
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 hover:text-blue-200 touch-none" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-3 w-3" />
        </button>
        <Icon className="h-3 w-3 text-blue-200 mx-0.5" />
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-blue-200" title="Duplicate">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-red-300" title="Delete">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="py-1">
        <BlockView block={block} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ─── Add block button ─────────────────────────────────────────────────────────

const ADD_BLOCKS: Array<[Block["type"], string, string]> = [
  ["heading",   "H",  "Heading"],
  ["paragraph", "¶",  "Paragraph"],
  ["button",    "↗",  "Button"],
  ["image",     "🖼", "Image"],
  ["list",      "•",  "List"],
  ["quote",     "❝",  "Quote"],
  ["divider",   "—",  "Divider"],
  ["spacer",    "⬜", "Spacer"],
];

function AddBlockButton({ onAdd }: { onAdd: (type: Block["type"]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-center mt-2">
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full px-3 py-1 transition-colors">
        <Plus className="h-3 w-3" /> Add block
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-1 z-30 w-52"
          onClick={(e) => e.stopPropagation()}>
          {ADD_BLOCKS.map(([type, icon, label]) => (
            <button key={type} onClick={() => { onAdd(type); setOpen(false); }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-blue-50 transition-colors text-center">
              <span className="text-base">{icon}</span>
              <span className="text-xs text-gray-600">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column view ──────────────────────────────────────────────────────────────

function ColumnView({
  column, selection, onSelectBlock, onUpdateBlock, onDuplicateBlock, onDeleteBlock, onAddBlock,
}: {
  column: Column; selection: Selection | null;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddBlock: (type: Block["type"]) => void;
}) {
  return (
    <div className="flex-1 min-w-0 px-2">
      <SortableContext items={column.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[60px]">
          {column.blocks.map((block) => (
            <SortableBlock key={block.id} block={block}
              isSelected={selection?.kind === "block" && selection.blockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onUpdate={(p) => onUpdateBlock(block.id, p)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
            />
          ))}
          {column.blocks.length === 0 && (
            <div className="min-h-[60px] rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-400">Drop blocks here</span>
            </div>
          )}
        </div>
      </SortableContext>
      <AddBlockButton onAdd={onAddBlock} />
    </div>
  );
}

// ─── Column resize handle ─────────────────────────────────────────────────────

function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const startX = useRef<number | null>(null);

  return (
    <div
      className="w-4 shrink-0 flex items-center justify-center cursor-col-resize group/resize"
      onPointerDown={(e) => {
        startX.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (startX.current !== null) {
          onDrag(e.clientX - startX.current);
          startX.current = e.clientX;
        }
      }}
      onPointerUp={() => { startX.current = null; }}
    >
      <div className="w-0.5 h-8 bg-gray-200 rounded group-hover/resize:bg-blue-400 transition-colors" />
    </div>
  );
}

// ─── LayoutSection editor ─────────────────────────────────────────────────────

export function LayoutSectionEditor({
  section, selection, onSelect, onUpdate,
}: {
  section: LayoutSection;
  selection: Selection | null;
  onSelect: (sel: Selection) => void;
  onUpdate: (updated: LayoutSection) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Find which column a block lives in
  function findColumn(blockId: string): string | null {
    for (const col of section.columns) {
      if (col.blocks.some((b) => b.id === blockId)) return col.id;
    }
    return null;
  }

  function findBlock(blockId: string): Block | null {
    for (const col of section.columns) {
      const b = col.blocks.find((x) => x.id === blockId);
      if (b) return b;
    }
    return null;
  }

  function updateColumns(cols: Column[]) {
    onUpdate({ ...section, columns: cols });
  }

  function handleUpdateBlock(columnId: string, blockId: string, patch: Partial<Block>) {
    updateColumns(section.columns.map((col) =>
      col.id !== columnId ? col : {
        ...col,
        blocks: col.blocks.map((b) => b.id !== blockId ? b : { ...b, ...patch } as Block),
      }
    ));
  }

  function handleAddBlock(columnId: string, type: Block["type"]) {
    updateColumns(section.columns.map((col) =>
      col.id !== columnId ? col : { ...col, blocks: [...col.blocks, makeBlock(type)] }
    ));
  }

  function handleDuplicateBlock(columnId: string, blockId: string) {
    updateColumns(section.columns.map((col) => {
      if (col.id !== columnId) return col;
      const idx = col.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return col;
      const copy = { ...JSON.parse(JSON.stringify(col.blocks[idx])), id: uid() };
      const blocks = [...col.blocks.slice(0, idx + 1), copy, ...col.blocks.slice(idx + 1)];
      return { ...col, blocks };
    }));
  }

  function handleDeleteBlock(columnId: string, blockId: string) {
    updateColumns(section.columns.map((col) =>
      col.id !== columnId ? col : { ...col, blocks: col.blocks.filter((b) => b.id !== blockId) }
    ));
  }

  function handleResizeColumn(idx: number, deltaPx: number) {
    if (section.columns.length < 2) return;
    const containerWidth = 800; // approximate canvas inner width
    const totalFr = section.columns.reduce((s, c) => s + c.widthFr, 0);
    const deltaFr = (deltaPx / containerWidth) * totalFr;
    const cols = [...section.columns];
    const next = idx + 1;
    if (next >= cols.length) return;
    const minFr = 0.2;
    cols[idx]  = { ...cols[idx],  widthFr: Math.max(minFr, cols[idx].widthFr  + deltaFr) };
    cols[next] = { ...cols[next], widthFr: Math.max(minFr, cols[next].widthFr - deltaFr) };
    updateColumns(cols);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveBlockId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeColId = findColumn(String(active.id));
    if (!activeColId) return;

    // Check if dragging over a column container (empty column)
    const overColId = section.columns.find((c) => c.id === String(over.id))?.id;
    if (overColId && overColId !== activeColId) {
      const activeBlock = findBlock(String(active.id));
      if (!activeBlock) return;
      updateColumns(section.columns.map((col) => {
        if (col.id === activeColId) return { ...col, blocks: col.blocks.filter((b) => b.id !== String(active.id)) };
        if (col.id === overColId)   return { ...col, blocks: [...col.blocks, activeBlock] };
        return col;
      }));
      return;
    }

    const overColId2 = findColumn(String(over.id));
    if (!overColId2 || overColId2 === activeColId) return;

    // Cross-column move
    const activeBlock = findBlock(String(active.id));
    if (!activeBlock) return;
    const overBlockIdx = section.columns.find((c) => c.id === overColId2)!.blocks.findIndex((b) => b.id === String(over.id));
    updateColumns(section.columns.map((col) => {
      if (col.id === activeColId) return { ...col, blocks: col.blocks.filter((b) => b.id !== String(active.id)) };
      if (col.id === overColId2) {
        const blocks = [...col.blocks];
        blocks.splice(overBlockIdx >= 0 ? overBlockIdx : blocks.length, 0, activeBlock);
        return { ...col, blocks };
      }
      return col;
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBlockId(null);
    const { active, over } = event;
    if (!over) return;
    const activeColId = findColumn(String(active.id));
    const overColId   = findColumn(String(over.id));
    if (!activeColId || !overColId || activeColId !== overColId) return;
    // Same-column reorder
    updateColumns(section.columns.map((col) => {
      if (col.id !== activeColId) return col;
      const oldIdx = col.blocks.findIndex((b) => b.id === String(active.id));
      const newIdx = col.blocks.findIndex((b) => b.id === String(over.id));
      return { ...col, blocks: arrayMove(col.blocks, oldIdx, newIdx) };
    }));
  }

  const sectionIsSelected = selection?.kind === "section" && selection.sectionId === section.id;
  const activeBlock = activeBlockId ? findBlock(activeBlockId) : null;
  const gridCols = section.columns.map((c) => `${c.widthFr}fr`).join(" ");

  return (
    <div
      className={`rounded-sm transition-all ${sectionIsSelected ? "ring-2 ring-blue-300 ring-offset-2" : ""}`}
      style={{
        background: section.bgColor || undefined,
        paddingTop: section.paddingTop ?? 48,
        paddingBottom: section.paddingBottom ?? 48,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ kind: "section", sectionId: section.id });
      }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "start" }}>
          {section.columns.map((col, idx) => (
            <div key={col.id} className="flex">
              <ColumnView column={col} selection={selection}
                onSelectBlock={(blockId) => onSelect({ kind: "block", sectionId: section.id, columnId: col.id, blockId })}
                onUpdateBlock={(blockId, patch) => handleUpdateBlock(col.id, blockId, patch)}
                onDuplicateBlock={(blockId) => handleDuplicateBlock(col.id, blockId)}
                onDeleteBlock={(blockId) => handleDeleteBlock(col.id, blockId)}
                onAddBlock={(type) => handleAddBlock(col.id, type)}
              />
              {idx < section.columns.length - 1 && (
                <ResizeHandle onDrag={(delta) => handleResizeColumn(idx, delta)} />
              )}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeBlock && (
            <div className="bg-white rounded-lg shadow-xl p-3 opacity-90 pointer-events-none">
              <BlockView block={activeBlock} onUpdate={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
