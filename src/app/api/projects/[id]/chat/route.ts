import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

// Returns the effective viewer id, and whether they may access this project.
async function authorize(session: any, projectId: string) {
  const u = session.user as any;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project) return { ok: false as const };
  if (isAdmin(u)) {
    const viewing = cookies().get("adminViewingAs")?.value;
    return { ok: true as const, viewerId: viewing || u.id };
  }
  const companyUserIds = await getCompanyUserIds(u.id);
  if (!companyUserIds.includes(project.userId)) return { ok: false as const };
  return { ok: true as const, viewerId: u.id };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await authorize(session, params.id);
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.projectChatMessage.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages, me: auth.viewerId });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const auth = await authorize(session, params.id);
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const author = await prisma.user.findUnique({ where: { id: auth.viewerId }, select: { name: true } });
  const message = await prisma.projectChatMessage.create({
    data: { projectId: params.id, userId: auth.viewerId, authorName: author?.name || "User", body: body.trim() },
  });
  return NextResponse.json({ message }, { status: 201 });
}
