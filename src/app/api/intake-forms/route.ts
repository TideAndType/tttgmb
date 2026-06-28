import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const forms = await prisma.intakeForm.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });
  return NextResponse.json(forms);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const fields = Array.isArray(body.fields)
    ? body.fields
        .filter((f: any) => f && typeof f.label === "string" && f.label.trim())
        .map((f: any, i: number) => ({
          id: f.id || `f${i}`,
          label: f.label.trim(),
          type: ["text", "textarea", "select"].includes(f.type) ? f.type : "text",
          required: !!f.required,
          options: Array.isArray(f.options) ? f.options.filter((o: any) => typeof o === "string" && o.trim()) : [],
        }))
    : [];
  if (fields.length === 0) return NextResponse.json({ error: "Add at least one field" }, { status: 400 });

  const form = await prisma.intakeForm.create({
    data: { title, description: body.description?.trim() || null, fields },
  });
  return NextResponse.json(form, { status: 201 });
}
