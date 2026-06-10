"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Card {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  position: number;
  columnId: string;
}

interface Column {
  id: string;
  name: string;
  position: number;
  cards: Card[];
}

export default function KanbanPage() {
  const { id } = useParams<{ id: string }>();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<string | null>(null); // columnId
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const fetchColumns = () => {
    fetch(`/api/projects/${id}/columns`)
      .then((r) => r.json())
      .then((data) => setColumns(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchColumns();
  }, [id]);

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    await fetch(`/api/projects/${id}/columns/${columnId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newCardTitle }),
    });
    setNewCardTitle("");
    setAddingCard(null);
    fetchColumns();
  };

  const deleteCard = async (columnId: string, cardId: string) => {
    await fetch(`/api/projects/${id}/columns/${columnId}/cards/${cardId}`, {
      method: "DELETE",
    });
    fetchColumns();
  };

  const moveCard = async (card: Card, direction: "left" | "right") => {
    const sortedCols = [...columns].sort((a, b) => a.position - b.position);
    const currentColIndex = sortedCols.findIndex((c) => c.id === card.columnId);
    const targetColIndex = direction === "left" ? currentColIndex - 1 : currentColIndex + 1;
    if (targetColIndex < 0 || targetColIndex >= sortedCols.length) return;
    const targetCol = sortedCols[targetColIndex];

    await fetch(`/api/projects/${id}/columns/${card.columnId}/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: targetCol.id, position: targetCol.cards.length }),
    });
    fetchColumns();
  };

  const addColumn = async () => {
    if (!newColumnName.trim()) return;
    await fetch(`/api/projects/${id}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newColumnName }),
    });
    setNewColumnName("");
    setAddingColumn(false);
    fetchColumns();
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column and all its cards?")) return;
    await fetch(`/api/projects/${id}/columns/${columnId}`, { method: "DELETE" });
    fetchColumns();
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-full">
      <div className="mb-6 px-1">
        <div className="text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${id}`} className="hover:underline">Project</Link>
          {" / "}
          <span>Card Board</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Card Board</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground px-1">Loading board...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
          {sortedColumns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 bg-muted/30 rounded-lg border border-border"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{column.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {column.cards.length}
                  </span>
                </div>
                <button
                  onClick={() => deleteColumn(column.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-12">
                {column.cards
                  .sort((a, b) => a.position - b.position)
                  .map((card) => (
                    <div
                      key={card.id}
                      className="group bg-card rounded-md border border-border p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-foreground leading-snug flex-1">
                          {card.title}
                        </p>
                        <button
                          onClick={() => deleteCard(column.id, card.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {card.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                      {card.dueDate && (
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-2 text-xs",
                            isOverdue(card.dueDate)
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(card.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveCard(card, "left")}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          title="Move left"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveCard(card, "right")}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          title="Move right"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add card */}
              <div className="p-2 pt-0">
                {addingCard === column.id ? (
                  <div className="space-y-2">
                    <Input
                      autoFocus
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Card title..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCard(column.id);
                        if (e.key === "Escape") {
                          setAddingCard(null);
                          setNewCardTitle("");
                        }
                      }}
                      className="text-sm h-8"
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addCard(column.id)}
                        disabled={!newCardTitle.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setAddingCard(null);
                          setNewCardTitle("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingCard(column.id);
                      setNewCardTitle("");
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add card
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add column */}
          <div className="flex-shrink-0 w-72">
            {addingColumn ? (
              <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                <Input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addColumn();
                    if (e.key === "Escape") {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }
                  }}
                  className="text-sm h-8"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addColumn}
                    disabled={!newColumnName.trim()}
                  >
                    Add Column
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg border border-dashed border-border transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add column
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
