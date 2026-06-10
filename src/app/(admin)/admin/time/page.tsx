"use client";

import { useEffect, useState } from "react";
import { Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/utils";

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

export default function AdminTimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterDays, setFilterDays] = useState<DaysFilter>("30");
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [thisMonthMinutes, setThisMonthMinutes] = useState(0);
  const [mostActiveClient, setMostActiveClient] = useState<string>("");

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [filterClient, filterDays]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      // silently fail
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.set("userId", filterClient);
      params.set("days", filterDays);
      const res = await fetch(`/api/time?${params.toString()}`);
      const data = await res.json();
      const fetched: TimeEntry[] = data.entries || [];
      setEntries(fetched);

      // Compute summary
      const total = fetched.reduce((sum, e) => sum + e.minutes, 0);
      setTotalMinutes(total);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = fetched
        .filter((e) => new Date(e.date) >= startOfMonth)
        .reduce((sum, e) => sum + e.minutes, 0);
      setThisMonthMinutes(thisMonth);

      // Most active client by minutes
      const byClient: Record<string, { name: string; minutes: number }> = {};
      for (const entry of fetched) {
        const uid = entry.user.id;
        if (!byClient[uid]) byClient[uid] = { name: entry.user.companyName || entry.user.name, minutes: 0 };
        byClient[uid].minutes += entry.minutes;
      }
      const sorted = Object.values(byClient).sort((a, b) => b.minutes - a.minutes);
      setMostActiveClient(sorted[0]?.name || "—");
    } catch {
      // silently fail
    }
    setLoading(false);
  };

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
            <p className="text-sm text-muted-foreground">This Month (All Clients)</p>
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
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{mostActiveClient || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
          ))}
        </select>
        <select
          value={filterDays}
          onChange={(e) => setFilterDays(e.target.value as DaysFilter)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="0">All time</option>
        </select>
      </div>

      {/* Table */}
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
                      <td className="px-4 py-3 font-medium text-foreground">
                        {entry.user.companyName || entry.user.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                        {formatMinutes(entry.minutes)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.project ? (
                          <span
                            className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: entry.project.color + "22",
                              color: entry.project.color,
                            }}
                          >
                            {entry.project.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.task?.title || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {entry.description || "—"}
                      </td>
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
