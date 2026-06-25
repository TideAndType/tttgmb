"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  companyName?: string | null;
}

const PRESET_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Violet" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userId: "",
    name: "",
    description: "",
    color: "#6366f1",
    status: "active",
    startDate: "",
    dueDate: "",
  });

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.name) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: form.userId,
        name: form.name,
        description: form.description || undefined,
        color: form.color,
        status: form.status,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create project");
      setLoading(false);
      return;
    }

    router.push("/admin/projects");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>Create a project workspace for a client</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="userId">Client</Label>
              <select
                id="userId"
                name="userId"
                value={form.userId}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="">— Select a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Q1 Website Redesign"
                value={form.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                placeholder="A brief description of this project..."
                value={form.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="active">Active</option>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="blocked">Blocked</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date (optional)</Label>
                <Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={handleChange} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Input id="dueDate" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      form.color === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !form.userId || !form.name}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Link href="/admin/projects">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
