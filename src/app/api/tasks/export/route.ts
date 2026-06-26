import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvHeaders } from "@/lib/csv";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    include: {
      user: { select: { name: true, companyName: true } },
      assignees: { include: { user: { select: { name: true } } } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const headers = [
    "Title", "Client", "Status", "Priority", "Due Date", "Visible to Client",
    "Tags", "Assignees", "Comments", "Created",
  ];

  const rows = tasks.map((t) => [
    t.title,
    t.user?.companyName || t.user?.name || "",
    t.status,
    t.priority,
    fmtDate(t.dueDate),
    t.visibleToClient ? "Yes" : "No",
    (t.tags || []).join("; "),
    t.assignees.map((a) => a.user?.name).filter(Boolean).join("; "),
    t._count.comments,
    fmtDate(t.createdAt),
  ]);

  const csv = toCsv(headers, rows);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, { headers: csvHeaders(`tasks-${date}.csv`) });
}
