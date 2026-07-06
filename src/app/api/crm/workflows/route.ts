import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflows = await prisma.workflow.findMany({
    where: { userId }, orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { position: "asc" } }, _count: { select: { enrollments: true } } },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: (b.name?.trim() || "New Workflow").slice(0, 140),
      trigger: ["contact_created", "form_submitted", "booking_created", "manual"].includes(b.trigger) ? b.trigger : "contact_created",
    },
    include: { steps: true },
  });
  return NextResponse.json({ workflow });
}
