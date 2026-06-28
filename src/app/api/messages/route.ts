import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

// Recent project messages across the (effective) user's company — for the
// dashboard Messages widget. Impersonation-aware for admins/super-admins.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const effectiveUserId = (viewing && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) ? viewing : u.id;

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") || "4", 10), 20);
  const companyUserIds = await getCompanyUserIds(effectiveUserId);
  const projects = await prisma.project.findMany({ where: { userId: { in: companyUserIds } }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return NextResponse.json([]);

  const messages = await prisma.message.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, authorName: true, createdAt: true, projectId: true },
  });
  return NextResponse.json(messages);
}
