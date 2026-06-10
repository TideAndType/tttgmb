"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deliverable {
  id: string;
  title: string;
  type: "DESIGN" | "COPY" | "REPORT" | "CONTRACT" | "OTHER";
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
  version: number;
  updatedAt: string;
  user: { id: string; name: string; companyName?: string | null };
  _count: { comments: number };
}

const typeConfig: Record<string, { label: string; className: string }> = {
  DESIGN: { label: "Design", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  COPY: { label: "Copy", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700" },
  REPORT: { label: "Report", className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700" },
  CONTRACT: { label: "Contract", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  OTHER: { label: "Other", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  CHANGES_REQUESTED: { label: "Changes Requested", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
};

type FilterTab = "all" | "PENDING" | "CHANGES_REQUESTED" | "APPROVED";

export default function AdminApprovalsPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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

  const filtered =
    activeTab === "all"
      ? deliverables
      : deliverables.filter((d) => d.status === activeTab);

  const counts = {
    all: deliverables.length,
    PENDING: deliverables.filter((d) => d.status === "PENDING").length,
    CHANGES_REQUESTED: deliverables.filter((d) => d.status === "CHANGES_REQUESTED").length,
    APPROVED: deliverables.filter((d) => d.status === "APPROVED").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "CHANGES_REQUESTED", label: "Changes Requested" },
    { key: "APPROVED", label: "Approved" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approvals</h1>
          <p className="text-muted-foreground mt-1">Manage deliverables sent to clients for approval</p>
        </div>
        <Link href="/admin/approvals/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Deliverable
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({counts[tab.key]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card text-center py-16">
          <p className="text-muted-foreground mb-4">
            {activeTab === "all" ? "No deliverables yet." : `No deliverables with status "${tabs.find(t => t.key === activeTab)?.label}".`}
          </p>
          {activeTab === "all" && (
            <Link href="/admin/approvals/new">
              <Button>Submit First Deliverable</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Version</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, idx) => {
                const typeCfg = typeConfig[d.type] || typeConfig.OTHER;
                const statusCfg = statusConfig[d.status] || statusConfig.PENDING;
                return (
                  <tr
                    key={d.id}
                    className={cn("border-b border-border last:border-0 hover:bg-muted/20 transition-colors", idx % 2 === 0 ? "" : "")}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{d.user.companyName || d.user.name}</div>
                      <div className="text-xs text-muted-foreground">{d.user.companyName ? d.user.name : ""}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <Link href={`/admin/approvals/${d.id}`} className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", typeCfg.className)}>
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-xs font-medium">
                        v{d.version}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", statusCfg.className)}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(d.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/approvals/${d.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1.5 h-7">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
