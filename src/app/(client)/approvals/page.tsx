"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, MessageSquare, Download, CheckCheck, RotateCcw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  _count: { comments: number };
}

const typeConfig: Record<string, { label: string; className: string }> = {
  DESIGN: { label: "Design", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  COPY: { label: "Copy", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700" },
  REPORT: { label: "Report", className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700" },
  CONTRACT: { label: "Contract", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  OTHER: { label: "Other", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600" },
};

function DeliverableCard({
  deliverable,
  showActions,
  onAction,
}: {
  deliverable: Deliverable;
  showActions: boolean;
  onAction: (id: string, action: "approve" | "request_changes", comment?: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const typeCfg = typeConfig[deliverable.type] || typeConfig.OTHER;

  const handleApprove = async () => {
    if (!confirm("Approve this deliverable?")) return;
    setLoading(true);
    await onAction(deliverable.id, "approve");
    setLoading(false);
  };

  const handleRequestChanges = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    await onAction(deliverable.id, "request_changes", comment);
    setLoading(false);
    setExpanded(false);
    setComment("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", typeCfg.className)}>
                {typeCfg.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-medium">
                v{deliverable.version}
              </span>
              {deliverable._count.comments > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {deliverable._count.comments}
                </span>
              )}
            </div>
            <Link href={`/approvals/${deliverable.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
              {deliverable.title}
            </Link>
            {deliverable.description && (
              <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {new Date(deliverable.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>

        {deliverable.fileUrl && deliverable.fileName && (
          <a
            href={`/api/uploads/${deliverable.fileUrl}`}
            download={deliverable.fileName}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
          >
            <Download className="h-3.5 w-3.5" />
            {deliverable.fileName}
          </a>
        )}
      </CardHeader>

      {showActions && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={handleApprove}
              disabled={loading}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20 gap-1.5"
              onClick={() => setExpanded(!expanded)}
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Request Changes
            </Button>
          </div>

          {expanded && (
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what needs to change..."
                rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
                  onClick={handleRequestChanges}
                  disabled={loading || !comment.trim()}
                >
                  Submit Request
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setExpanded(false); setComment(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ApprovalsPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliverables();
  }, []);

  const fetchDeliverables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setDeliverables(data.deliverables || []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleAction = async (
    id: string,
    action: "approve" | "request_changes",
    comment?: string
  ) => {
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    if (res.ok) {
      await fetchDeliverables();
    }
  };

  const needsReview = deliverables.filter((d) => d.status === "PENDING");
  const changesRequested = deliverables.filter((d) => d.status === "CHANGES_REQUESTED");
  const approved = deliverables.filter((d) => d.status === "APPROVED");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve deliverables from your account team</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : deliverables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No deliverables yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Your account team will submit deliverables here for your review and approval.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="needs-review">
          <TabsList className="mb-6">
            <TabsTrigger value="needs-review">
              Needs Review
              {needsReview.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {needsReview.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="changes-requested">
              Changes Requested
              {changesRequested.length > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {changesRequested.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {approved.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {approved.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs-review">
            {needsReview.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Nothing awaiting your review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {needsReview.map((d) => (
                  <DeliverableCard
                    key={d.id}
                    deliverable={d}
                    showActions={true}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes-requested">
            {changesRequested.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No deliverables awaiting revision.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {changesRequested.map((d) => (
                  <DeliverableCard
                    key={d.id}
                    deliverable={d}
                    showActions={false}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approved.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No approved deliverables yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approved.map((d) => (
                  <DeliverableCard
                    key={d.id}
                    deliverable={d}
                    showActions={false}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
