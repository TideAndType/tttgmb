import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

const UPLOADS_DIR = process.cwd() + "/uploads";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.clientFile.findUnique({ where: { id: params.id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.clientFile.delete({ where: { id: params.id } });

  try {
    const { unlink } = await import("fs/promises");
    await unlink(path.join(UPLOADS_DIR, record.filename));
  } catch {}

  return NextResponse.json({ ok: true });
}
