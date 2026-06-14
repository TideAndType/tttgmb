"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Loader2 } from "lucide-react";
import Link from "next/link";

export function ProjectsWidget() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { setProjects(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary" /> Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> :
          projects.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No active projects</p> :
          <div className="space-y-2">
            {projects.slice(0, 4).map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? "#6366f1" }} />
                <span className="text-foreground truncate flex-1">{p.name}</span>
              </div>
            ))}
            <Link href="/projects" className="text-xs text-primary hover:underline block pt-1">View all {projects.length} projects →</Link>
          </div>}
      </CardContent>
    </Card>
  );
}
