import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Admin: form definition + all responses (with responder names).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const form = await prisma.intakeForm.findUnique({
    where: { id: params.id },
    include: { responses: { orderBy: { submittedAt: "desc" } } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userIds = Array.from(new Set(form.responses.map((r) => r.userId)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, companyName: true } });
  const nameById = new Map(users.map((u) => [u.id, u.companyName || u.name]));
  const responses = form.responses.map((r) => ({ ...r, responderName: nameById.get(r.userId) ?? "Unknown" }));

  return NextResponse.json({ ...form, responses });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, any> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  try {
    const form = await prisma.intakeForm.update({ where: { id: params.id }, data });
    return NextResponse.json(form);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await prisma.intakeForm.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
