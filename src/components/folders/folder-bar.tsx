"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder as FolderIcon, Plus, X } from "lucide-react";

export interface Folder {
  id: string;
  name: string;
  count?: number;
}

// Reusable folder filter/manager. `baseUrl` is the folders collection endpoint
// (e.g. /api/project-folders). Calls back with the active folder selection:
// null = all, "none" = uncategorized, or a folder id.
export function FolderBar({
  baseUrl,
  active,
  onChange,
  onFoldersLoaded,
}: {
  baseUrl: string;
  active: string | null;
  onChange: (v: string | null) => void;
  onFoldersLoaded?: (folders: Folder[]) => void;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(baseUrl);
    if (res.ok) {
      const data = await res.json();
      const list = data.folders || [];
      setFolders(list);
      onFoldersLoaded?.(list);
    }
  }, [baseUrl, onFoldersLoaded]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    await fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setNewName("");
    load();
  };

  const remove = async (id: string) => {
    await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
    if (active === id) onChange(null);
    load();
  };

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
        <FolderIcon className="h-3.5 w-3.5" /> Folders:
      </span>
      <button onClick={() => onChange(null)}>
        <Badge variant={active === null ? "default" : "outline"} className="cursor-pointer">All</Badge>
      </button>
      {folders.map((f) => (
        <span key={f.id} className="inline-flex items-center group">
          <button onClick={() => onChange(f.id === active ? null : f.id)}>
            <Badge variant={active === f.id ? "default" : "outline"} className="cursor-pointer">
              {f.name}{typeof f.count === "number" ? ` (${f.count})` : ""}
            </Badge>
          </button>
          <button onClick={() => remove(f.id)} title="Delete folder" className="ml-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button onClick={() => onChange(active === "none" ? null : "none")}>
        <Badge variant={active === "none" ? "default" : "outline"} className="cursor-pointer">Uncategorized</Badge>
      </button>
      <div className="inline-flex items-center gap-1 ml-2">
        <Input
          placeholder="New folder (e.g. 2024)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          className="h-7 text-xs w-40"
        />
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={create} disabled={!newName.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
