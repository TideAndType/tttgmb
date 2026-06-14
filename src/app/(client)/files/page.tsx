"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Image, File, Download, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  label: string | null;
  version: number;
  createdAt: string;
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

function formatSize(bytes: number): string {
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

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="h-8 w-8 text-muted-foreground" />;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("text") ||
    mimeType.includes("document")
  ) {
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  }
  return <File className="h-8 w-8 text-muted-foreground" />;
}

interface VersionModalProps {
  file: ClientFile | null;
  onClose: () => void;
}

function VersionModal({ file, onClose }: VersionModalProps) {
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

export default function FilesPage() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionFile, setVersionFile] = useState<ClientFile | null>(null);

  useEffect(() => {
    fetch("/api/files")
      .then((r) => r.json())
      .then((data) => {
        setFiles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Files</h1>
        <p className="text-muted-foreground mt-1">Documents and files shared with you</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No files yet. Your team will share files here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id}>
              <Card className="hover:border-primary/50 hover:shadow-sm transition-all h-full">
                <CardContent className="p-4 flex flex-col gap-2">
                  <FileIcon mimeType={file.mimeType} />
                  <p className="text-sm font-medium text-foreground truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {file.label && (
                      <Badge variant="secondary" className="text-xs w-fit">{file.label}</Badge>
                    )}
                    {file.version > 1 && (
                      <Badge variant="outline" className="text-xs">v{file.version}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                    <span>{formatSize(file.size)}</span>
                    <span>·</span>
                    <span>
                      {new Date(file.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <a
                      href={`/api/uploads/${file.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    </a>
                    {file.version > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="View version history"
                        onClick={() => setVersionFile(file)}
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <VersionModal
        file={versionFile}
        onClose={() => setVersionFile(null)}
      />
    </div>
  );
}
