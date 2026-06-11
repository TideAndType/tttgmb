import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyTaskCreated: true,
      notifyTaskCompleted: true,
      notifyApprovalNeeded: true,
      notifyProposalSent: true,
      notifyInvoiceSent: true,
    },
  });

  return NextResponse.json(user ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();

  const allowed = ["notifyTaskCreated", "notifyTaskCompleted", "notifyApprovalNeeded", "notifyProposalSent", "notifyInvoiceSent"];
  const data: Record<string, boolean> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }

  await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ success: true });
}
