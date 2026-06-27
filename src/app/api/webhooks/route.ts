import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ webhooks, availableEvents: WEBHOOK_EVENTS });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\/.+/.test(url)) {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }
  const events = Array.isArray(body.events)
    ? body.events.filter((e: string) => (WEBHOOK_EVENTS as readonly string[]).includes(e))
    : [];
  if (events.length === 0) {
    return NextResponse.json({ error: "Select at least one event" }, { status: 400 });
  }
  const webhook = await prisma.webhook.create({
    data: { url, events, secret: typeof body.secret === "string" && body.secret.trim() ? body.secret.trim() : null },
  });
  return NextResponse.json(webhook, { status: 201 });
}
