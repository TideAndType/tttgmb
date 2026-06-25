"use client";

import { useState } from "react";
import { CheckSquare, Square, Plus, X } from "lucide-react";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TaskTodoListProps {
  taskId: string;
  initialTodos: Todo[];
  canAdd?: boolean; // admin only
}

export function TaskTodoList({ taskId, initialTodos, canAdd = false }: TaskTodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const done = todos.filter((t) => t.done).length;

  async function handleToggle(todo: Todo) {
    setToggling(todo.id);
    const res = await fetch(`/api/tasks/${taskId}/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data.todo : t)));
    }
    setToggling(null);
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [...prev, data.todo]);
      setNewText("");
      setAdding(false);
    }
    setSaving(false);
  }

  async function handleDelete(todoId: string) {
    setDeleting(todoId);
    const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, { method: "DELETE" });
    if (res.ok) setTodos((prev) => prev.filter((t) => t.id !== todoId));
    setDeleting(null);
  }

  if (todos.length === 0 && !canAdd) return null;

  return (
    <div className="mt-3 border-t pt-3">
      {todos.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            To-dos ({done}/{todos.length})
          </span>
          {todos.length > 0 && (
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${todos.length ? (done / todos.length) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-start gap-2 group">
            <button
              onClick={() => handleToggle(todo)}
              disabled={toggling === todo.id}
              className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {todo.done ? (
                <CheckSquare className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
            </button>
            <span className={`text-xs flex-1 leading-5 ${todo.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {todo.text}
            </span>
            {canAdd && (
              <button
                onClick={() => handleDelete(todo.id)}
                disabled={deleting === todo.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canAdd && (
        adding ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewText(""); }
              }}
              placeholder="Add a to-do item..."
              autoFocus
              className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newText.trim()}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              {saving ? "..." : "Add"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewText(""); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add to-do
          </button>
        )
      )}
    </div>
  );
}
