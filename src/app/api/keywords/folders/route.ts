import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function effectiveUserId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return (v && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? v : u.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const folders = await prisma.keywordFolder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { keywords: true } } },
  });
  return NextResponse.json({
    folders: folders.map((f) => ({ id: f.id, name: f.name, count: f._count.keywords })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = effectiveUserId(session);
  const { name } = await req.json();
  const clean = String(name || "").trim();
  if (!clean) return NextResponse.json({ error: "Folder name required" }, { status: 400 });

  const folder = await prisma.keywordFolder.upsert({
    where: { userId_name: { userId, name: clean } },
    create: { userId, name: clean },
    update: {},
  });
  return NextResponse.json({ folder: { id: folder.id, name: folder.name } });
}
