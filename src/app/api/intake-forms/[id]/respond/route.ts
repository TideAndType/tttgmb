import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotificationForAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await prisma.intakeForm.findUnique({ where: { id: params.id } });
  if (!form || !form.active) return NextResponse.json({ error: "Form not available" }, { status: 404 });

  const body = await req.json();
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

  // Enforce required fields.
  const fields = (form.fields as any[]) || [];
  for (const f of fields) {
    if (f.required && !String(answers[f.id] ?? "").trim()) {
      return NextResponse.json({ error: `"${f.label}" is required` }, { status: 400 });
    }
  }

  const response = await prisma.intakeResponse.upsert({
    where: { formId_userId: { formId: params.id, userId: user.id } },
    create: { formId: params.id, userId: user.id, answers },
    update: { answers, submittedAt: new Date() },
  });

  createNotificationForAdmins(
    "intake_submitted",
    "Form submitted",
    `${user.name ?? "A client"} submitted "${form.title}"`,
    "/admin/forms"
  );

  return NextResponse.json({ response });
}
