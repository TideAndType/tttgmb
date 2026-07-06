import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

const DEFAULT_STAGES = [
  { name: "New Lead", color: "#6366f1" },
  { name: "Contacted", color: "#0ea5e9" },
  { name: "Qualified", color: "#f59e0b" },
  { name: "Proposal Sent", color: "#8b5cf6" },
  { name: "Won", color: "#22c55e" },
];

// List pipelines with stages + their opportunities. Creates a starter pipeline
// on first use so the board is never empty.
export async function GET() {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let pipelines = await prisma.crmPipeline.findMany({
    where: { userId },
    orderBy: { position: "asc" },
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: {
          opportunities: {
            orderBy: { position: "asc" },
            include: { contact: { select: { id: true, name: true, company: true } } },
          },
        },
      },
    },
  });

  if (pipelines.length === 0) {
    await prisma.crmPipeline.create({
      data: {
        userId, name: "Sales Pipeline",
        stages: { create: DEFAULT_STAGES.map((s, i) => ({ name: s.name, color: s.color, position: i })) },
      },
    });
    pipelines = await prisma.crmPipeline.findMany({
      where: { userId }, orderBy: { position: "asc" },
      include: { stages: { orderBy: { position: "asc" }, include: { opportunities: { orderBy: { position: "asc" }, include: { contact: { select: { id: true, name: true, company: true } } } } } } },
    });
  }
  return NextResponse.json({ pipelines });
}

// Create a pipeline (with optional custom stages).
export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const count = await prisma.crmPipeline.count({ where: { userId } });
  const stages = Array.isArray(b.stages) && b.stages.length ? b.stages : DEFAULT_STAGES;
  const pipeline = await prisma.crmPipeline.create({
    data: {
      userId, name: String(b.name).slice(0, 120), position: count,
      stages: { create: stages.map((s: any, i: number) => ({ name: String(s.name || `Stage ${i + 1}`).slice(0, 60), color: s.color || "#6366f1", position: i })) },
    },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ pipeline });
}
