import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;

  const file = await prisma.clientFile.findUnique({
    where: { id: params.id },
    include: { versions: { orderBy: { version: "desc" } } },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Access control: client can only see their own files
  if (user.role === "CLIENT") {
    const userIds = await getCompanyUserIds(user.id);
    if (!userIds.includes(file.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Build the version list: current version (synthesized) + historical versions
  const currentEntry = {
    id: file.id,
    version: file.version,
    filename: file.filename,
    originalName: file.originalName,
    size: file.size,
    createdAt: file.updatedAt.toISOString(),
    isCurrent: true,
  };

  const historicalEntries = file.versions.map((v) => ({
    id: v.id,
    version: v.version,
    filename: v.filename,
    originalName: v.originalName,
    size: v.size,
    createdAt: v.createdAt.toISOString(),
    isCurrent: false,
  }));

  return NextResponse.json([currentEntry, ...historicalEntries]);
}
