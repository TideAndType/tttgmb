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
  const user = await prisma.user.findUnique({ where: { id: effectiveUserId(session) }, select: { image: true } });
  return NextResponse.json({ image: user?.image ?? null });
}

// Accepts a small data-URL image (downscaled client-side) and stores it on the user.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image } = await req.json();
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }
  // Guard against oversized payloads (~200KB of base64).
  if (image.length > 280_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  await prisma.user.update({ where: { id: effectiveUserId(session) }, data: { image } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: effectiveUserId(session) }, data: { image: null } });
  return NextResponse.json({ ok: true });
}
