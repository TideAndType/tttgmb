"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Image, File, Download } from "lucide-react";

interface ClientFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  label: string | null;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

export default function FilesPage() {
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);

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
                  {file.label && (
                    <Badge variant="secondary" className="text-xs w-fit">{file.label}</Badge>
                  )}
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
                  <a
                    href={`/api/uploads/${file.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" className="w-full mt-1">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
