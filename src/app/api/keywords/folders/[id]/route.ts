import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function effectiveUserId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const existing = await prisma.keywordFolder.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  const clean = String(name || "").trim();
  if (!clean) return NextResponse.json({ error: "Folder name required" }, { status: 400 });

  await prisma.keywordFolder.update({ where: { id: params.id }, data: { name: clean } });
  return NextResponse.json({ ok: true });
}

// Delete the folder; keywords inside are kept (folder set to null via SetNull).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const existing = await prisma.keywordFolder.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.keywordFolder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
