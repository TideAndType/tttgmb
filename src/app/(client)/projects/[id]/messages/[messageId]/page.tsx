"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, ExternalLink } from "lucide-react";

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  authorId: string;
}

interface MessageLink {
  id: string;
  url: string;
  label: string;
}

interface Message {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  comments: Comment[];
  links: MessageLink[];
}

function getLinkIcon(url: string) {
  if (url.includes("figma.com")) {
    return <span className="font-bold text-purple-600">Fg</span>;
  }
  if (url.includes("docs.google.com")) {
    return <span className="font-bold text-blue-600">GDoc</span>;
  }
  if (url.includes("dropbox.com")) {
    return <span className="font-bold text-blue-500">DB</span>;
  }
  if (url.includes("drive.google.com")) {
    return <span className="font-bold text-green-600">GDrive</span>;
  }
  return <ExternalLink className="h-3 w-3" />;
}

export default function MessagePage() {
  const { id, messageId } = useParams<{ id: string; messageId: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMessage = () => {
    fetch(`/api/projects/${id}/messages/${messageId}`)
      .then((r) => r.json())
      .then((data) => setMessage(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessage();
  }, [id, messageId]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}/messages/${messageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (res.ok) {
        setCommentBody("");
        fetchMessage();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/projects/${id}/messages/${messageId}/comments/${commentId}`, {
      method: "DELETE",
    });
    fetchMessage();
  };

  const deleteMessage = async () => {
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/projects/${id}/messages/${messageId}`, { method: "DELETE" });
    router.push(`/projects/${id}/messages`);
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!message) return <p className="text-muted-foreground">Message not found.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href={`/projects/${id}`} className="hover:underline">Project</Link>
        {" / "}
        <Link href={`/projects/${id}/messages`} className="hover:underline">Messages</Link>
        {" / "}
        <span className="truncate">{message.title}</span>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{message.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <span>{message.authorName}</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{new Date(message.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={deleteMessage}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{message.body}</p>
          {message.links && message.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {message.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline border border-primary/30 rounded px-2 py-0.5 bg-primary/5"
                >
                  {getLinkIcon(link.url)}
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {message.comments.length} Comment{message.comments.length !== 1 ? "s" : ""}
        </h2>
        <div className="space-y-4">
          {message.comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex-1 bg-muted/40 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{comment.authorName}</span>
                    <span className="text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add comment */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submitComment} className="space-y-3">
            <h3 className="font-medium text-foreground">Add a Comment</h3>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment..."
              rows={4}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <Button type="submit" disabled={submitting || !commentBody.trim()} size="sm">
              {submitting ? "Posting..." : "Post Comment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
