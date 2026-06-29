import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json();
  const clean = String(name || "").trim();
  if (!clean) return NextResponse.json({ error: "Folder name required" }, { status: 400 });
  await prisma.taskFolder.update({ where: { id: params.id }, data: { name: clean } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.taskFolder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
