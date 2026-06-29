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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const status = req.nextUrl.searchParams.get("status");

  let where: any = {};
  if (isAdmin(u) && !viewing) {
    if (status) where.status = status;
  } else {
    const ids = await getCompanyUserIds(effectiveId(session));
    where.userId = { in: ids };
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;
  const { subject, body } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }
  const creatorId = effectiveId(session);
  const author = await prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } });
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: creatorId,
      subject: subject.trim(),
      messages: {
        create: { userId: creatorId, authorName: author?.name || "Client", body: body.trim(), isStaff: isAdmin(u) && !cookies().get("adminViewingAs")?.value },
      },
    },
  });
  return NextResponse.json({ ticket }, { status: 201 });
}
