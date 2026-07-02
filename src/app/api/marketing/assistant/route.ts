import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveMarketingUserId, buildBusinessContext, askClaude, aiConfigured } from "@/lib/marketing-ai";

export const dynamic = "force-dynamic";

// GET → list conversations, or ?id= to fetch one with its messages.
export async function GET(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const conversation = await prisma.assistantConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ conversation });
  }
  const conversations = await prisma.assistantConversation.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" }, take: 30,
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ conversations });
}

// POST { conversationId?, message } → append the user message, get Claude's
// reply with full business context + prior turns, persist both.
export async function POST(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 400 });

  const { conversationId, message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  let convo = conversationId
    ? await prisma.assistantConversation.findFirst({ where: { id: conversationId, userId }, include: { messages: { orderBy: { createdAt: "asc" } } } })
    : null;

  if (!convo) {
    convo = await prisma.assistantConversation.create({
      data: { userId, title: String(message).slice(0, 60) },
      include: { messages: true },
    });
  }

  const history = convo.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const context = await buildBusinessContext(userId);

  const reply = await askClaude({
    system:
      "You are the business's dedicated AI marketing employee. You know their business deeply (context below). Answer marketing questions, write copy/campaigns, explain analytics, and always be specific and actionable. When you produce content, follow their brand voice. Keep answers focused and practical.\n\n" +
      `--- Business context ---\n${context}`,
    user: message,
    history,
    maxTokens: 1600,
  });

  const [, assistantMsg] = await prisma.$transaction([
    prisma.assistantMessage.create({ data: { conversationId: convo.id, role: "user", content: String(message).slice(0, 8000) } }),
    prisma.assistantMessage.create({ data: { conversationId: convo.id, role: "assistant", content: reply || "(no response)" } }),
    prisma.assistantConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ conversationId: convo.id, reply: assistantMsg.content });
}

// DELETE ?id= → remove a conversation.
export async function DELETE(req: NextRequest) {
  const userId = await effectiveMarketingUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const convo = await prisma.assistantConversation.findFirst({ where: { id, userId } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.assistantConversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
