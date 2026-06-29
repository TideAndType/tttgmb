import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Stores the last OpenLens data we pulled per project so the UI can render a
// cached snapshot without spending API quota. Refresh only happens on demand.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ data: null });
  const row = await prisma.openLensCache.findUnique({ where: { projectId } }).catch(() => null);
  return NextResponse.json({ data: row?.data ?? null, updatedAt: row?.updatedAt ?? null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId, data } = await req.json();
  if (!projectId || data === undefined) return NextResponse.json({ error: "Missing projectId or data" }, { status: 400 });
  try {
    const row = await prisma.openLensCache.upsert({
      where: { projectId },
      create: { projectId, data },
      update: { data },
    });
    return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
