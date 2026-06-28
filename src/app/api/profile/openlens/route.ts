import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function effectiveUserId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: effectiveUserId(session) },
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
    where: { id: effectiveUserId(session) },
    data: { openLensApiKey: apiKey || null },
  });
  return NextResponse.json({ ok: true });
}
