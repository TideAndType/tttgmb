import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Active forms the signed-in client has not yet responded to, plus their completed ones.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const forms = await prisma.intakeForm.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { responses: { where: { userId }, select: { id: true, answers: true, submittedAt: true } } },
  });

  const result = forms.map(({ responses, ...f }) => ({
    ...f,
    response: responses[0] ?? null,
  }));
  return NextResponse.json(result);
}
