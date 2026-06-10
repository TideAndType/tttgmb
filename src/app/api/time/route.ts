import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const filterUserId = searchParams.get("userId");
  const filterProjectId = searchParams.get("projectId");
  const filterTaskId = searchParams.get("taskId");

  const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

  const where: any = {};
  if (since) where.date = { gte: since };

  if (user.role === "ADMIN") {
    if (filterUserId) where.userId = filterUserId;
    if (filterProjectId) where.projectId = filterProjectId;
    if (filterTaskId) where.taskId = filterTaskId;
  } else {
    where.userId = user.id;
    if (filterProjectId) where.projectId = filterProjectId;
    if (filterTaskId) where.taskId = filterTaskId;
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, color: true } },
      task: { select: { id: true, title: true } },
      user: { select: { id: true, name: true, companyName: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await req.json();
  const { projectId, taskId, description, minutes, date } = body;

  if (!minutes || typeof minutes !== "number" || minutes < 1) {
    return NextResponse.json({ error: "minutes is required and must be a positive number" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      projectId: projectId || null,
      taskId: taskId || null,
      description: description || null,
      minutes,
      date: date ? new Date(date) : new Date(),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      task: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
