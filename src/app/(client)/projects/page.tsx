"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, MessageSquare, LayoutGrid, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  _count: { messages: number; cards: number };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:    { label: "Active",     className: "bg-blue-100 text-blue-700 border-blue-200" },
  on_track:  { label: "On Track",   className: "bg-green-100 text-green-700 border-green-200" },
  at_risk:   { label: "At Risk",    className: "bg-amber-100 text-amber-700 border-amber-200" },
  blocked:   { label: "Blocked",    className: "bg-red-100 text-red-700 border-red-200" },
  on_hold:   { label: "On Hold",    className: "bg-gray-100 text-gray-600 border-gray-200" },
  completed: { label: "Completed",  className: "bg-violet-100 text-violet-700 border-violet-200" },
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-1">Your active project workspaces</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground max-w-sm">Your account team will create projects for you here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
            const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== "completed";

            return (
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: project.color }} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", sc.className)}>
                      {sc.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {(project.startDate || project.dueDate) && (
                    <div className="flex flex-wrap gap-3 mb-3 text-xs text-muted-foreground">
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Start: {formatDate(project.startDate)}
                        </span>
                      )}
                      {project.dueDate && (
                        <span className={cn("flex items-center gap-1", isOverdue ? "text-red-600 font-medium" : "")}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          Due: {formatDate(project.dueDate)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      {project._count.messages} message{project._count.messages !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <LayoutGrid className="h-4 w-4" />
                      {project._count.cards} card{project._count.cards !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" className="w-full">Open</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
