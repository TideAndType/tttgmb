"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  CheckCheck,
  RotateCcw,
  CheckCircle,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  action: string | null;
  createdAt: string;
}

interface Deliverable {
  id: string;
  title: string;
  description?: string | null;
  type: "DESIGN" | "COPY" | "REPORT" | "CONTRACT" | "OTHER";
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  fileUrl?: string | null;
  fileName?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; companyName?: string | null };
  comments: ApprovalComment[];
}

const typeConfig: Record<string, { label: string; className: string }> = {
  DESIGN: { label: "Design", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  COPY: { label: "Copy", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700" },
  REPORT: { label: "Report", className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700" },
  CONTRACT: { label: "Contract", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  OTHER: { label: "Other", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Needs Review", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  CHANGES_REQUESTED: { label: "Changes Requested", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
};

function CommentEntry({ comment }: { comment: ApprovalComment }) {
  const date = new Date(comment.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const actionIcon =
    comment.action === "approved" ? (
      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
    ) : comment.action === "changes_requested" ? (
      <RotateCcw className="h-4 w-4 text-amber-600 flex-shrink-0" />
    ) : comment.action === "resubmit" ? (
      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
    ) : (
      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    );

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">{actionIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">{date}</span>
          {comment.action && (
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                comment.action === "approved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                comment.action === "changes_requested" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                comment.action === "resubmit" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              )}
            >
              {comment.action === "approved"
                ? "Approved"
                : comment.action === "changes_requested"
                ? "Requested Changes"
                : "Submitted Revision"}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/80">{comment.body}</p>
      </div>
    </div>
  );
}

export default function ClientApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [changesExpanded, setChangesExpanded] = useState(false);
  const [changesComment, setChangesComment] = useState("");
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDeliverable();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDeliverable = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}`);
      if (res.status === 404) {
        router.push("/approvals");
        return;
      }
      const data = await res.json();
      setDeliverable(data.deliverable);
    } catch {
      setError("Failed to load deliverable");
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!confirm("Approve this deliverable?")) return;
    setActionLoading(true);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (res.ok) {
      await fetchDeliverable();
    } else {
      setError("Failed to approve");
    }
    setActionLoading(false);
  };

  const handleRequestChanges = async () => {
    if (!changesComment.trim()) return;
    setActionLoading(true);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_changes", comment: changesComment }),
    });
    if (res.ok) {
      setChangesExpanded(false);
      setChangesComment("");
      await fetchDeliverable();
    } else {
      setError("Failed to request changes");
    }
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const res = await fetch(`/api/approvals/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: newComment }),
    });
    if (res.ok) {
      setNewComment("");
      await fetchDeliverable();
    } else {
      setError("Failed to post comment");
    }
    setCommentLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!deliverable) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-muted-foreground">Deliverable not found.</p>
      </div>
    );
  }

  const typeCfg = typeConfig[deliverable.type] || typeConfig.OTHER;
  const statusCfg = statusConfig[deliverable.status] || statusConfig.PENDING;
  const isPending = deliverable.status === "PENDING";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/approvals"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", typeCfg.className)}>
                  {typeCfg.label}
                </span>
                <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-medium">
                  v{deliverable.version}
                </span>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusCfg.className)}>
                  {statusCfg.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{deliverable.title}</h1>
              {deliverable.description && (
                <p className="text-muted-foreground mt-1.5">{deliverable.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            <span>Submitted {new Date(deliverable.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            {deliverable.updatedAt !== deliverable.createdAt && (
              <span>Updated {new Date(deliverable.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            )}
          </div>

          {deliverable.fileUrl && deliverable.fileName && (
            <a
              href={`/api/uploads/${deliverable.fileUrl}`}
              download={deliverable.fileName}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
            >
              <Download className="h-3.5 w-3.5" />
              {deliverable.fileName}
            </a>
          )}
        </CardHeader>

        {isPending && (
          <CardContent className="pt-0 border-t border-border mt-2 pb-4">
            <p className="text-sm font-medium text-foreground mb-3">Your decision</p>
            <div className="flex gap-2 mb-3">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCheck className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20 gap-1.5"
                onClick={() => setChangesExpanded(!changesExpanded)}
                disabled={actionLoading}
              >
                <RotateCcw className="h-4 w-4" />
                Request Changes
              </Button>
            </div>

            {changesExpanded && (
              <div className="space-y-2">
                <textarea
                  value={changesComment}
                  onChange={(e) => setChangesComment(e.target.value)}
                  placeholder="Describe what needs to change..."
                  rows={4}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
                    onClick={handleRequestChanges}
                    disabled={actionLoading || !changesComment.trim()}
                  >
                    Submit Request
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setChangesExpanded(false); setChangesComment(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Comment timeline */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Activity
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          {deliverable.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {deliverable.comments.map((c) => (
                <CommentEntry key={c.id} comment={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add plain comment */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="font-semibold text-foreground text-sm">Add a comment</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or leave a note..."
            rows={3}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
          />
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={commentLoading || !newComment.trim()}
          >
            {commentLoading ? "Posting..." : "Post Comment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
