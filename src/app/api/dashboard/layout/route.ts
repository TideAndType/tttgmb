import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_LAYOUT = [
  { id: "welcome", enabled: true },
  { id: "projects", enabled: true },
  { id: "tasks", enabled: true },
  { id: "messages", enabled: true },
  { id: "invoices", enabled: true },
  { id: "approvals", enabled: true },
  { id: "meetings", enabled: true },
  { id: "files", enabled: true },
  { id: "ai-visibility", enabled: true },
  { id: "activity", enabled: true },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { dashboardLayout: true },
  });
  return NextResponse.json(user?.dashboardLayout ?? DEFAULT_LAYOUT);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const layout = await req.json();
  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { dashboardLayout: layout },
  });
  return NextResponse.json({ ok: true });
}
