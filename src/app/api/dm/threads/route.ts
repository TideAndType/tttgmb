import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  // Get all messages involving current user
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [{ fromId: user.id }, { toId: user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by counterpart
  const threadMap = new Map<string, { lastMessage: any; unreadCount: number }>();
  for (const msg of messages) {
    const counterpartId = msg.fromId === user.id ? msg.toId : msg.fromId;
    if (!threadMap.has(counterpartId)) {
      threadMap.set(counterpartId, { lastMessage: msg, unreadCount: 0 });
    }
    if (msg.toId === user.id && !msg.readAt) {
      const entry = threadMap.get(counterpartId)!;
      entry.unreadCount++;
    }
  }

  // Fetch counterpart user info
  const counterpartIds = Array.from(threadMap.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: counterpartIds } },
    select: { id: true, name: true, companyName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const threads = counterpartIds.map((id) => {
    const { lastMessage, unreadCount } = threadMap.get(id)!;
    const counterpart = userMap.get(id);
    return {
      counterpartId: id,
      counterpartName: counterpart?.name ?? "Unknown",
      counterpartCompany: counterpart?.companyName ?? null,
      lastMessage,
      unreadCount,
    };
  });

  return NextResponse.json(threads);
}
