"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload } from "lucide-react";

interface Client {
  id: string;
  name: string;
  companyName?: string | null;
}

export default function NewApprovalPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    userId: "",
    title: "",
    description: "",
    type: "OTHER",
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
    if (!form.userId || !form.title) {
      setError("Client and title are required.");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("userId", form.userId);
    formData.append("title", form.title);
    formData.append("type", form.type);
    if (form.description) formData.append("description", form.description);
    if (selectedFile) formData.append("file", selectedFile);

    const res = await fetch("/api/approvals", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create deliverable");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/admin/approvals/${data.deliverable.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/approvals"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Deliverable</CardTitle>
          <CardDescription>Send a deliverable to a client for review and approval</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

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
                placeholder="Homepage Redesign v2"
                value={form.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="DESIGN">Design</option>
                <option value="COPY">Copy</option>
                <option value="REPORT">Report</option>
                <option value="CONTRACT">Contract</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Add context or notes for the client..."
                value={form.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File (optional)</Label>
              <label
                htmlFor="file"
                className="flex items-center gap-3 w-full border border-dashed border-input rounded-md px-4 py-3 cursor-pointer hover:border-primary/60 transition-colors"
              >
                <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {selectedFile ? selectedFile.name : "Click to upload a file"}
                </span>
                <input
                  id="file"
                  type="file"
                  className="sr-only"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove file
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Deliverable"}
              </Button>
              <Link href="/admin/approvals">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
