import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

async function owned(id: string, userId: string) {
  const f = await prisma.leadForm.findUnique({ where: { id } });
  return f && f.userId === userId ? f : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await prisma.leadForm.findFirst({
    where: { id: params.id, userId },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ form });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 120);
  if (Array.isArray(b.fields)) data.fields = b.fields;
  if (typeof b.submitLabel === "string") data.submitLabel = b.submitLabel.slice(0, 60);
  if (typeof b.successMessage === "string") data.successMessage = b.successMessage.slice(0, 400);
  if ("redirectUrl" in b) data.redirectUrl = b.redirectUrl || null;
  if (typeof b.accentColor === "string") data.accentColor = b.accentColor;
  if (typeof b.createContact === "boolean") data.createContact = b.createContact;
  const form = await prisma.leadForm.update({ where: { id: params.id }, data });
  return NextResponse.json({ form });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await owned(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.leadForm.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
