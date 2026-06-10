import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const companyName = (session.user as any).companyName ?? session.user?.name ?? null;

  const [logo, firstColor] = await Promise.all([
    prisma.brandAsset.findFirst({
      where: { userId, type: "LOGO" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.brandColor.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    logoUrl: logo ? `/api/uploads/${logo.filename}` : null,
    primaryColor: firstColor?.hex ?? null,
    companyName,
  });
}
