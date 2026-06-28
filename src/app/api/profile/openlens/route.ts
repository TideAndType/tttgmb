import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { openLensApiKey: true },
  });
  const key = user?.openLensApiKey;
  return NextResponse.json({ hasKey: !!key, maskedKey: key ? `${key.slice(0, 8)}…` : null });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { apiKey } = await req.json();
  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { openLensApiKey: apiKey || null },
  });
  return NextResponse.json({ ok: true });
}
