import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const folders = await prisma.projectFolder.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json({ folders: folders.map((f) => ({ id: f.id, name: f.name, count: f._count.projects })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json();
  const clean = String(name || "").trim();
  if (!clean) return NextResponse.json({ error: "Folder name required" }, { status: 400 });
  const folder = await prisma.projectFolder.create({ data: { name: clean } });
  return NextResponse.json({ folder: { id: folder.id, name: folder.name } });
}
