import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.message.findUnique({ where: { id: params.messageId } });
  if (!message || message.projectId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { url, label } = body;
  if (!url || !label) {
    return NextResponse.json({ error: "url and label are required" }, { status: 400 });
  }

  const link = await prisma.messageLink.create({
    data: { messageId: params.messageId, url, label },
  });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const linkId = searchParams.get("linkId");
  if (!linkId) return NextResponse.json({ error: "linkId is required" }, { status: 400 });

  await prisma.messageLink.delete({ where: { id: linkId } });
  return NextResponse.json({ success: true });
}
