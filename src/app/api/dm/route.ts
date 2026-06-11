import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const withId = searchParams.get("with");
  if (!withId) return NextResponse.json({ error: "Missing with param" }, { status: 400 });

  // Auth check: client can only DM admin
  if (user.role === "CLIENT") {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!admin || withId !== admin.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromId: user.id, toId: withId },
        { fromId: withId, toId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread messages as read
  await prisma.directMessage.updateMany({
    where: { toId: user.id, fromId: withId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { toId, body } = await req.json();
  if (!toId || !body) return NextResponse.json({ error: "toId and body required" }, { status: 400 });

  // Client can only DM admin
  if (user.role === "CLIENT") {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (!admin || toId !== admin.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const msg = await prisma.directMessage.create({
    data: { fromId: user.id, toId, body },
  });
  return NextResponse.json(msg, { status: 201 });
}
