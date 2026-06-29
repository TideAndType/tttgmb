import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin((session?.user as any))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  if (body.done !== undefined) data.done = !!body.done;
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.date !== undefined) data.date = new Date(body.date);
  await prisma.milestone.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAdmin((session?.user as any))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.milestone.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
