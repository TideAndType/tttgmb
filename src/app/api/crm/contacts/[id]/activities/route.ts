import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

// Log a note/call/email/meeting on a contact's timeline.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact || contact.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  if (!b.body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });
  const session = await getServerSession(authOptions);
  const authorName = (session?.user as any)?.name || "Team";

  const activity = await prisma.contactActivity.create({
    data: {
      contactId: params.id,
      type: ["note", "call", "email", "meeting"].includes(b.type) ? b.type : "note",
      body: String(b.body).slice(0, 4000),
      authorName,
    },
  });
  await prisma.contact.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ activity });
}
