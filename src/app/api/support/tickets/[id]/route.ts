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
function effectiveId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return v && isAdmin(u) ? v : u.id;
}

async function canAccess(session: any, ticketUserId: string) {
  const u = session.user as any;
  if (isAdmin(u) && !cookies().get("adminViewingAs")?.value) return true;
  const ids = await getCompanyUserIds(effectiveId(session));
  return ids.includes(ticketUserId);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccess(session, ticket.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccess(session, ticket.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { status } = await req.json();
  if (!["open", "pending", "closed"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  await prisma.supportTicket.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
