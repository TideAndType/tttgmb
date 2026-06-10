import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";
import { getCompanyUserIds } from "@/lib/company";

const UPLOADS_DIR = process.cwd() + "/uploads";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const companyUserIds = await getCompanyUserIds(userId);
  const asset = await prisma.brandAsset.findUnique({ where: { id: params.id } });

  if (!asset || !companyUserIds.includes(asset.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await unlink(path.join(UPLOADS_DIR, asset.filename));
  } catch (e) {
    // File may not exist, continue
  }

  await prisma.brandAsset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
