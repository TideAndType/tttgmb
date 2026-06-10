"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/utils";

interface ProjectSummary {
  projectId: string;
  projectName: string;
  minutes: number;
}

interface TimeEntry {
  id: string;
  date: string;
  minutes: number;
  project?: { id: string; name: string; color: string } | null;
}

interface ProjectRow {
  projectId: string;
  projectName: string;
  totalMinutesAllTime: number;
  totalMinutesThisMonth: number;
  lastEntryDate: string | null;
}

export default function TimeProjectsPage() {
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [chartData, setChartData] = useState<{ name: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, entriesRes] = await Promise.all([
          fetch("/api/time/summary"),
          fetch("/api/time?days=0"),
        ]);
        const summaryData = await summaryRes.json();
        const entriesData = await entriesRes.json();

        const allEntries: TimeEntry[] = entriesData.entries || [];
        const byProject: ProjectSummary[] = summaryData.byProject || [];

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Calculate per-project stats from all entries
        const statsMap: Record<string, ProjectRow> = {};
        for (const entry of allEntries) {
          if (!entry.project) continue;
          const pid = entry.project.id;
          if (!statsMap[pid]) {
            statsMap[pid] = {
              projectId: pid,
              projectName: entry.project.name,
              totalMinutesAllTime: 0,
              totalMinutesThisMonth: 0,
              lastEntryDate: null,
            };
          }
          statsMap[pid].totalMinutesAllTime += entry.minutes;
          if (new Date(entry.date) >= startOfMonth) {
            statsMap[pid].totalMinutesThisMonth += entry.minutes;
          }
          if (!statsMap[pid].lastEntryDate || entry.date > statsMap[pid].lastEntryDate!) {
            statsMap[pid].lastEntryDate = entry.date;
          }
        }

        // Merge with summary for all-time from summary (in case entries are paginated)
        for (const p of byProject) {
          if (!statsMap[p.projectId]) {
            statsMap[p.projectId] = {
              projectId: p.projectId,
              projectName: p.projectName,
              totalMinutesAllTime: p.minutes,
              totalMinutesThisMonth: 0,
              lastEntryDate: null,
            };
          }
        }

        setProjectRows(Object.values(statsMap).sort((a, b) => b.totalMinutesAllTime - a.totalMinutesAllTime));

        // Chart: hours per project last 30 days
        const last30Map: Record<string, { name: string; minutes: number }> = {};
        for (const entry of allEntries) {
          if (!entry.project || new Date(entry.date) < thirtyDaysAgo) continue;
          const pid = entry.project.id;
          if (!last30Map[pid]) last30Map[pid] = { name: entry.project.name, minutes: 0 };
          last30Map[pid].minutes += entry.minutes;
        }
        setChartData(
          Object.values(last30Map)
            .sort((a, b) => b.minutes - a.minutes)
            .map((d) => ({ name: d.name, hours: Math.round((d.minutes / 60) * 10) / 10 }))
        );
      } catch {
        // silently fail
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Time by Project</h1>
        <p className="text-muted-foreground mt-1">Hours breakdown across your projects</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hours per Project (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="h" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number) => [`${value}h`, "Hours"]}
                    />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projectRows.length === 0 ? (
                <p className="text-muted-foreground text-sm p-6">No project time logged yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-muted-foreground font-medium">Project</th>
                      <th className="text-right px-6 py-3 text-muted-foreground font-medium">This Month</th>
                      <th className="text-right px-6 py-3 text-muted-foreground font-medium">All Time</th>
                      <th className="text-right px-6 py-3 text-muted-foreground font-medium">Last Entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectRows.map((row) => (
                      <tr key={row.projectId} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-3">
                          <Link
                            href={`/projects/${row.projectId}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {row.projectName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-right text-foreground">
                          {formatMinutes(row.totalMinutesThisMonth)}
                        </td>
                        <td className="px-6 py-3 text-right text-foreground">
                          {formatMinutes(row.totalMinutesAllTime)}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {row.lastEntryDate
                            ? new Date(row.lastEntryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
