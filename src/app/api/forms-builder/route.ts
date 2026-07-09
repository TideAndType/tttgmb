import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { effectiveUserId } from "@/lib/effective-user";

export const dynamic = "force-dynamic";

const DEFAULT_FIELDS = [
  { id: "name", label: "Full name", type: "text", required: true, mapTo: "name" },
  { id: "email", label: "Email", type: "email", required: true, mapTo: "email" },
  { id: "phone", label: "Phone", type: "phone", required: false, mapTo: "phone" },
  { id: "message", label: "How can we help?", type: "textarea", required: false },
];

export async function GET() {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const forms = await prisma.leadForm.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest) {
  const userId = await effectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const form = await prisma.leadForm.create({
    data: {
      userId,
      name: (b.name?.trim() || "New Form").slice(0, 120),
      fields: Array.isArray(b.fields) && b.fields.length ? b.fields : DEFAULT_FIELDS,
    },
  });
  return NextResponse.json({ form });
}
