"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { AiAssistPanel } from "@/components/ai-assist-panel";

interface Client {
  id: string;
  name: string;
  companyName?: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

function hashColor(id: string): string {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function NewTaskPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userId: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
  });
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((data) => {
      setClients(Array.isArray(data) ? data : []);
    });
  }, []);

  // Load team members when a client is selected
  useEffect(() => {
    if (!form.userId) {
      setTeamMembers([]);
      setSelectedAssigneeIds([]);
      return;
    }
    setLoadingMembers(true);
    setSelectedAssigneeIds([]);
    fetch(`/api/admin/clients/${form.userId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setTeamMembers(data.members || []);
      })
      .catch(() => setTeamMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [form.userId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleAssignee = (memberId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      userId: form.userId,
      title: form.title,
      priority: form.priority,
      visibleToClient,
    };
    if (form.description) body.description = form.description;
    if (form.dueDate) body.dueDate = form.dueDate;
    if (selectedAssigneeIds.length > 0) body.assigneeIds = selectedAssigneeIds;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create task");
      setLoading(false);
      return;
    }

    router.push("/admin/tasks");
  };

  const selectedClient = clients.find((c) => c.id === form.userId);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/tasks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>Assign a task to a client</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Review homepage copy"
                value={form.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description (optional)</Label>
                <button
                  type="button"
                  onClick={() => setAiPanelOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Sparkles className="h-3 w-3" /> AI
                </button>
              </div>
              <textarea
                id="description"
                name="description"
                placeholder="Add more details about this task..."
                value={form.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Assignees multi-select — shown when a client with team members is selected */}
            {form.userId && (
              <div className="space-y-2">
                <Label>
                  Assignees
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(optional — owner is always included)</span>
                </Label>
                {loadingMembers ? (
                  <p className="text-sm text-muted-foreground">Loading team members...</p>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedClient ? "No other team members in this company." : ""}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((m) => {
                      const checked = selectedAssigneeIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleAssignee(m.id)}
                          disabled={loading}
                          className={`inline-flex items-center gap-1.5 text-sm rounded-full px-3 py-1 border transition-colors ${
                            checked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium text-white flex-shrink-0"
                            style={{ backgroundColor: hashColor(m.id) }}
                          >
                            {m.name[0].toUpperCase()}
                          </span>
                          {m.name}
                          {checked && <span className="text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                id="visibleToClient"
                type="checkbox"
                checked={visibleToClient}
                onChange={(e) => setVisibleToClient(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="visibleToClient" className="cursor-pointer font-normal">
                Visible to client
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
              <Link href="/admin/tasks">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <AiAssistPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        onInsert={(text) => {
          setForm((prev) => ({ ...prev, description: text }));
          setAiPanelOpen(false);
        }}
        defaultAction="task_description"
      />
    </div>
  );
}
