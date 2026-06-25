"use client";

import { useEffect, useState } from "react";
import { Clock, Download, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  companyName?: string | null;
}

interface TimeEntry {
  id: string;
  date: string;
  minutes: number;
  description?: string | null;
  user: { id: string; name: string; companyName?: string | null };
  project?: { id: string; name: string; color: string } | null;
  task?: { id: string; title: string } | null;
}

type DaysFilter = "7" | "30" | "90" | "0";
type ViewMode = "log" | "report";

interface GroupRow {
  key: string;
  label: string;
  sublabel?: string;
  minutes: number;
  color?: string;
  count: number;
}

function HorizontalBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden min-w-0">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color || "hsl(var(--primary))" }}
      />
    </div>
  );
}

export default function AdminTimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterDays, setFilterDays] = useState<DaysFilter>("30");
  const [view, setView] = useState<ViewMode>("log");

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchEntries(); }, [filterClient, filterDays]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : (data.clients || []));
    } catch { /* ignore */ }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.set("userId", filterClient);
      params.set("days", filterDays);
      const res = await fetch(`/api/time?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthMinutes = entries.filter((e) => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.minutes, 0);

  // Group by client
  const byClient: Record<string, GroupRow> = {};
  for (const e of entries) {
    const uid = e.user.id;
    if (!byClient[uid]) byClient[uid] = { key: uid, label: e.user.companyName || e.user.name, sublabel: e.user.companyName ? e.user.name : undefined, minutes: 0, count: 0 };
    byClient[uid].minutes += e.minutes;
    byClient[uid].count++;
  }
  const clientRows = Object.values(byClient).sort((a, b) => b.minutes - a.minutes);

  // Group by project
  const byProject: Record<string, GroupRow> = {};
  for (const e of entries) {
    const pid = e.project?.id ?? "__none__";
    if (!byProject[pid]) byProject[pid] = { key: pid, label: e.project?.name ?? "No project", minutes: 0, color: e.project?.color, count: 0 };
    byProject[pid].minutes += e.minutes;
    byProject[pid].count++;
  }
  const projectRows = Object.values(byProject).sort((a, b) => b.minutes - a.minutes);

  const maxClientMinutes = clientRows[0]?.minutes ?? 0;
  const maxProjectMinutes = projectRows[0]?.minutes ?? 0;
  const mostActiveClient = clientRows[0]?.label ?? "—";

  const exportCsv = () => {
    const header = ["Client", "Date", "Duration", "Project", "Task", "Description"];
    const rows = entries.map((e) => [
      e.user.companyName || e.user.name,
      new Date(e.date).toLocaleDateString("en-US"),
      formatMinutes(e.minutes),
      e.project?.name || "",
      e.task?.title || "",
      e.description || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "time-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">All client time entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatMinutes(thisMonthMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total in View</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatMinutes(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Most Active Client</p>
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{mostActiveClient}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
        </select>
        <select value={filterDays} onChange={(e) => setFilterDays(e.target.value as DaysFilter)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="0">All time</option>
        </select>
        <div className="flex rounded-md border border-border overflow-hidden ml-auto">
          <button onClick={() => setView("log")} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm transition-colors", view === "log" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")}>
            <List className="h-3.5 w-3.5" />Log
          </button>
          <button onClick={() => setView("report")} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-border", view === "report" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground")}>
            <BarChart3 className="h-3.5 w-3.5" />Report
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading entries...</p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No time entries</h3>
          <p className="text-muted-foreground text-sm">No entries match the current filters.</p>
        </div>
      ) : view === "report" ? (
        <div className="space-y-8">
          {/* By Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hours by Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientRows.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                    {row.sublabel && <p className="text-xs text-muted-foreground truncate">{row.sublabel}</p>}
                  </div>
                  <HorizontalBar value={row.minutes} max={maxClientMinutes} />
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatMinutes(row.minutes)}</p>
                    <p className="text-xs text-muted-foreground">{row.count} {row.count === 1 ? "entry" : "entries"}</p>
                  </div>
                </div>
              ))}
              {clientRows.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
            </CardContent>
          </Card>

          {/* By Project */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hours by Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectRows.map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="w-36 shrink-0 flex items-center gap-2">
                    {row.color && row.key !== "__none__" && (
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                  </div>
                  <HorizontalBar value={row.minutes} max={maxProjectMinutes} color={row.color} />
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatMinutes(row.minutes)}</p>
                    <p className="text-xs text-muted-foreground">{row.count} {row.count === 1 ? "entry" : "entries"}</p>
                  </div>
                </div>
              ))}
              {projectRows.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
            </CardContent>
          </Card>

          {/* Summary table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client × Project Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Client</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Project</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Hours</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const cross: Record<string, { client: string; project: string; color?: string; minutes: number; count: number }> = {};
                      for (const e of entries) {
                        const k = `${e.user.id}__${e.project?.id ?? "none"}`;
                        if (!cross[k]) cross[k] = { client: e.user.companyName || e.user.name, project: e.project?.name ?? "No project", color: e.project?.color, minutes: 0, count: 0 };
                        cross[k].minutes += e.minutes;
                        cross[k].count++;
                      }
                      return Object.values(cross)
                        .sort((a, b) => b.minutes - a.minutes)
                        .map((row, i) => (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{row.client}</td>
                            <td className="px-4 py-3">
                              {row.project !== "No project" && row.color ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: row.color + "22", color: row.color }}>
                                  {row.project}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">{row.project}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMinutes(row.minutes)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{row.count}</td>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Duration</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Project</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Task</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{entry.user.companyName || entry.user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{formatMinutes(entry.minutes)}</td>
                      <td className="px-4 py-3">
                        {entry.project ? (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: entry.project.color + "22", color: entry.project.color }}>
                            {entry.project.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.task?.title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{entry.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
