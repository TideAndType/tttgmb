"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  File,
  FileText,
  Image,
  Download,
  Trash2,
  Upload,
  Search,
  Plus,
  X,
  Clock,
  Folder as FolderIcon,
} from "lucide-react";

interface AdminFile {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  label: string | null;
  folder: string | null;
  version: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    companyName: string | null;
  } | null;
}

interface ClientOption {
  id: string;
  name: string | null;
  companyName: string | null;
}

interface VersionEntry {
  id: string;
  version: number;
  filename: string;
  originalName: string;
  size: number;
  createdAt: string;
  isCurrent: boolean;
}

type FileTypeFilter = "all" | "images" | "documents" | "other";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getClientLabel(user: AdminFile["user"]): string {
  if (!user) return "Unknown";
  return user.companyName || user.name || "Unknown";
}

function matchesTypeFilter(mimeType: string, filter: FileTypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "images") return mimeType.startsWith("image/");
  if (filter === "documents") {
    return (
      mimeType === "application/pdf" ||
      mimeType.includes("word") ||
      mimeType.includes("text") ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    );
  }
  if (filter === "other") {
    return (
      !mimeType.startsWith("image/") &&
      mimeType !== "application/pdf" &&
      !mimeType.includes("word") &&
      !mimeType.includes("text") &&
      !mimeType.includes("document") &&
      !mimeType.includes("spreadsheet") &&
      !mimeType.includes("presentation")
    );
  }
  return true;
}

function FileIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
  if (mimeType.startsWith("image/")) {
    return (
      <div className="relative h-12 w-12 rounded overflow-hidden bg-muted flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/uploads/${filename}`}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <Image className="h-6 w-6 text-muted-foreground absolute" />
      </div>
    );
  }
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("text") ||
    mimeType.includes("document")
  ) {
    return (
      <div className="h-12 w-12 rounded bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
        <FileText className="h-6 w-6 text-blue-500" />
      </div>
    );
  }
  return (
    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
      <File className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-12 w-12 rounded" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
  );
}

// --- Version History Modal ---
interface VersionHistoryModalProps {
  file: AdminFile | null;
  onClose: () => void;
}

function VersionHistoryModal({ file, onClose }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    fetch(`/api/files/${file.id}/versions`)
      .then((r) => r.json())
      .then((data) => {
        setVersions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [file]);

  return (
    <Dialog open={!!file} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Version History — {file?.originalName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No version history available.</p>
        ) : (
          <div className="space-y-2 py-2 max-h-96 overflow-y-auto">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    v{v.version}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(v.size)} · {formatDate(v.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.isCurrent && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                  <a
                    href={`/api/uploads/${v.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Upload Modal ---
interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  clients: ClientOption[];
  files: AdminFile[];
  onUploaded: () => void;
}

function UploadModal({ open, onClose, clients, files, onUploaded }: UploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [folder, setFolder] = useState("");
  const [replaceFileId, setReplaceFileId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files available for the selected client
  const clientFiles = selectedClientId
    ? files.filter((f) => f.userId === selectedClientId)
    : [];

  // Existing folder names for autocomplete suggestions
  const folderSuggestions = Array.from(
    new Set(files.map((f) => f.folder).filter((x): x is string => !!x))
  ).sort();

  const reset = useCallback(() => {
    setSelectedFile(null);
    setSelectedClientId("");
    setLabel("");
    setFolder("");
    setReplaceFileId("");
    setError("");
    setUploading(false);
    setDragOver(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError("Please select a file."); return; }
    if (!selectedClientId) { setError("Please select a client."); return; }

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("userId", selectedClientId);
    if (label.trim()) formData.append("label", label.trim());
    if (folder.trim()) formData.append("folder", folder.trim());

    const qs = replaceFileId ? `?replaceFileId=${encodeURIComponent(replaceFileId)}` : "";

    try {
      const res = await fetch(`/api/files${qs}`, { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed.");
        setUploading(false);
        return;
      }
      onUploaded();
      handleClose();
    } catch {
      setError("Network error. Please try again.");
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop a file, or <span className="text-primary underline">browse</span>
                </p>
              </>
            )}
          </div>

          {/* Client selector */}
          <div className="space-y-2">
            <Label htmlFor="upload-client">Client</Label>
            <select
              id="upload-client"
              value={selectedClientId}
              onChange={(e) => { setSelectedClientId(e.target.value); setReplaceFileId(""); }}
              disabled={uploading}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name || c.id}
                </option>
              ))}
            </select>
          </div>

          {/* Replace existing file */}
          {selectedClientId && clientFiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="upload-replace">Replace existing file (optional)</Label>
              <select
                id="upload-replace"
                value={replaceFileId}
                onChange={(e) => setReplaceFileId(e.target.value)}
                disabled={uploading}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">— Upload as new file —</option>
                {clientFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.originalName}{f.label ? ` (${f.label})` : ""} — v{f.version}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="upload-label">Label (optional)</Label>
            <Input
              id="upload-label"
              placeholder="e.g. Invoice, Contract, Report"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label htmlFor="upload-folder">Folder (optional)</Label>
            <Input
              id="upload-folder"
              list="folder-suggestions"
              placeholder="e.g. Contracts, Briefs, Brand Assets"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              disabled={uploading}
            />
            <datalist id="folder-suggestions">
              {folderSuggestions.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !selectedFile || !selectedClientId}>
              {uploading ? "Uploading..." : replaceFileId ? "Upload as New Version" : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [files, setFiles] = useState<AdminFile[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyFile, setHistoryFile] = useState<AdminFile | null>(null);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    const user = session?.user as { role?: string } | undefined;
    if (!session || user?.role !== "ADMIN") {
      router.replace("/login");
    }
  }, [session, status, router]);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (!res.ok) return;
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data: ClientOption[]) => {
        setClients(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleMove = async (file: AdminFile) => {
    const next = window.prompt(
      `Move "${file.label || file.originalName}" to which folder?\n(Leave blank for Uncategorized)`,
      file.folder || ""
    );
    if (next === null) return; // cancelled
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, folder: updated.folder } : f)));
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch {
      // silent
    }
  };

  // Stats
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const thisMonth = files.filter((f) => {
    const d = new Date(f.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // All folder names across files (for the filter dropdown)
  const allFolders = Array.from(
    new Set(files.map((f) => f.folder).filter((x): x is string => !!x))
  ).sort();

  // Filtered
  const filtered = files.filter((f) => {
    const q = search.toLowerCase();
    const nameMatch =
      f.originalName.toLowerCase().includes(q) ||
      (f.label?.toLowerCase().includes(q) ?? false) ||
      (f.folder?.toLowerCase().includes(q) ?? false) ||
      getClientLabel(f.user).toLowerCase().includes(q);
    const clientMatch = clientFilter === "all" || f.userId === clientFilter;
    const typeMatch = matchesTypeFilter(f.mimeType, typeFilter);
    const folderMatch =
      folderFilter === "all" ||
      (folderFilter === "__none__" ? !f.folder : f.folder === folderFilter);
    return nameMatch && clientMatch && typeMatch && folderMatch;
  });

  // Group filtered files by folder. Uncategorized files go last.
  const UNCATEGORIZED = "Uncategorized";
  const grouped = new Map<string, AdminFile[]>();
  for (const f of filtered) {
    const key = f.folder || UNCATEGORIZED;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  }
  const groupedEntries = Array.from(grouped.entries()).sort((a, b) => {
    if (a[0] === UNCATEGORIZED) return 1;
    if (b[0] === UNCATEGORIZED) return -1;
    return a[0].localeCompare(b[0]);
  });

  if (status === "loading") return null;
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== "ADMIN") return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Files</h1>
          <p className="text-muted-foreground mt-1">Manage files shared with clients</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold">{files.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-bold">{formatSize(totalSize)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Uploaded This Month</p>
              <p className="text-2xl font-bold">{thisMonth}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-[180px]"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName || c.name || c.id}
            </option>
          ))}
        </Select>
        <Select
          className="w-[160px]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FileTypeFilter)}
        >
          <option value="all">All Types</option>
          <option value="images">Images</option>
          <option value="documents">Documents</option>
          <option value="other">Other</option>
        </Select>
        {allFolders.length > 0 && (
          <Select
            className="w-[180px]"
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
          >
            <option value="all">All Folders</option>
            {allFolders.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
            <option value="__none__">Uncategorized</option>
          </Select>
        )}
        {(search || clientFilter !== "all" || typeFilter !== "all" || folderFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setClientFilter("all"); setTypeFilter("all"); setFolderFilter("all"); }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* File grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">
            {files.length === 0 ? "No files uploaded yet." : "No files match your filters."}
          </p>
          {files.length === 0 && (
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload your first file
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEntries.map(([folderName, folderFiles]) => (
            <div key={folderName}>
              <div className="flex items-center gap-2 mb-3">
                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{folderName}</h2>
                <span className="text-xs text-muted-foreground">({folderFiles.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {folderFiles.map((file) => (
            <Card key={file.id} className="flex flex-col">
              <CardContent className="p-4 flex flex-col gap-3 flex-1">
                <FileIcon mimeType={file.mimeType} filename={file.filename} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-foreground truncate"
                    title={file.originalName}
                  >
                    {file.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={getClientLabel(file.user)}>
                    {getClientLabel(file.user)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {file.label && (
                      <Badge variant="secondary" className="text-xs">
                        {file.label}
                      </Badge>
                    )}
                    {file.version > 1 && (
                      <Badge variant="outline" className="text-xs">
                        v{file.version}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{formatSize(file.size)}</p>
                  <p>{formatDate(file.createdAt)}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`/api/uploads/${file.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Move to folder"
                    onClick={() => handleMove(file)}
                  >
                    <FolderIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Version history"
                    onClick={() => setHistoryFile(file)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        clients={clients}
        files={files}
        onUploaded={fetchFiles}
      />

      <VersionHistoryModal
        file={historyFile}
        onClose={() => setHistoryFile(null)}
      />
    </div>
  );
}
