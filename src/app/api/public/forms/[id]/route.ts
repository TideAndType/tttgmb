import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public form definition for the embed page (no auth).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const form = await prisma.leadForm.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, fields: true, submitLabel: true, successMessage: true, redirectUrl: true, accentColor: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  return NextResponse.json({ form });
}
