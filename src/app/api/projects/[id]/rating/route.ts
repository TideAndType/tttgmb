import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCompanyUserIds } from "@/lib/company";
import { createNotificationForAdmins } from "@/lib/notifications";

// Returns the current user's rating for this project (or null).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const rating = await prisma.satisfactionRating.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: user.id } },
  });
  return NextResponse.json({ rating });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Must belong to the client's company.
  const companyIds = await getCompanyUserIds(user.id);
  if (!companyIds.includes(project.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status !== "completed") {
    return NextResponse.json({ error: "Project is not complete" }, { status: 400 });
  }

  const body = await req.json();
  const score = Number(body.score);
  const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "Score must be 1–5" }, { status: 400 });
  }

  const rating = await prisma.satisfactionRating.upsert({
    where: { projectId_userId: { projectId: params.id, userId: user.id } },
    create: { projectId: params.id, userId: user.id, score, comment },
    update: { score, comment },
  });

  createNotificationForAdmins(
    "csat_received",
    "New satisfaction rating",
    `${user.name ?? "A client"} rated "${project.name}" ${score}/5`,
    "/admin/projects"
  );

  return NextResponse.json({ rating });
}
