"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip, FileText, Image, Loader2 } from "lucide-react";
import Link from "next/link";

export function FilesWidget() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files").then(r => r.json()).then(d => { setFiles(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Paperclip className="w-4 h-4 text-primary" /> Files</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> :
          files.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No files shared yet</p> : (
            <>
              <div className="space-y-2">
                {files.slice(0, 4).map((f: any) => {
                  const isImg = f.mimeType?.startsWith("image/");
                  const Icon = isImg ? Image : FileText;
                  return (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground flex-1">{f.originalName}</span>
                      <a href={`/uploads/${f.filename}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Download</a>
                    </div>
                  );
                })}
              </div>
              <Link href="/files" className="text-xs text-primary hover:underline block pt-2">View all files →</Link>
            </>
          )}
      </CardContent>
    </Card>
  );
}
