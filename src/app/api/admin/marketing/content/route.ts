import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

// Cross-client content approval queue (admin). GET draft/pending content for
// all clients; PATCH to approve/reject any of it.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const content = await prisma.marketingContent.findMany({
    where: { status: "draft" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, companyName: true } } },
  });
  return NextResponse.json({ content });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["draft", "approved", "scheduled", "published"].includes(status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }
  const content = await prisma.marketingContent.update({ where: { id }, data: { status } });
  return NextResponse.json({ content });
}
