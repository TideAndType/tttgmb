import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const __u = session.user as any;
  const __viewing = cookies().get("adminViewingAs")?.value;
  const userId = (__viewing && (__u.role === "ADMIN" || __u.role === "SUPER_ADMIN")) ? __viewing : __u.id;

  const { siteUrl } = await req.json();
  if (!siteUrl) return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { gscProperty: siteUrl } });
  return NextResponse.json({ success: true });
}
