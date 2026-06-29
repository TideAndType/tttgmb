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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const staff = isAdmin(u) && !viewing;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!staff) {
    const ids = await getCompanyUserIds(effectiveId(session));
    if (!ids.includes(ticket.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const authorId = staff ? u.id : effectiveId(session);
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { name: true } });
  const message = await prisma.ticketMessage.create({
    data: { ticketId: params.id, userId: authorId, authorName: author?.name || (staff ? "Support" : "Client"), body: body.trim(), isStaff: staff },
  });
  // A staff reply moves it to pending; a client reply re-opens it.
  await prisma.supportTicket.update({ where: { id: params.id }, data: { status: staff ? "pending" : "open" } });
  return NextResponse.json({ message }, { status: 201 });
}
