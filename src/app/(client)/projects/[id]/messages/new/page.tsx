"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface LinkRow {
  label: string;
  url: string;
}

export default function NewMessagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof LinkRow, value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    const validLinks = links.filter((l) => l.url.trim() && l.label.trim());
    try {
      const res = await fetch(`/api/projects/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, links: validLinks }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to post message");
        return;
      }
      const msg = await res.json();
      router.push(`/projects/${id}/messages/${msg.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href={`/projects/${id}`} className="hover:underline">Project</Link>
        {" / "}
        <Link href={`/projects/${id}/messages`} className="hover:underline">Messages</Link>
        {" / "}
        <span>New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Subject</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is this message about?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                rows={8}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Attach Links</Label>
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLink(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-8"
                onClick={addLink}
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? "Posting..." : "Post Message"}
              </Button>
              <Link href={`/projects/${id}/messages`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
