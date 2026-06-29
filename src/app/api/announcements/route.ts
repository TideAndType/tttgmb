import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  // Admins always get the management view (all, or filtered by client) — even
  // while impersonating, so the Announcements page shows every post. The
  // `scope=client` param forces the company-scoped view (used by client UIs).
  const viewing = cookies().get("adminViewingAs")?.value;
  const filterClient = req.nextUrl.searchParams.get("clientId");
  const scope = req.nextUrl.searchParams.get("scope");

  // Announcements addressed directly to the signed-in account (e.g. an agency
  // admin seeing messages from the super admin).
  if (scope === "mine") {
    const announcements = await prisma.announcement.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ announcements });
  }

  if (isAdmin(user) && scope !== "client") {
    const where = filterClient ? { userId: filterClient } : {};
    try {
      const announcements = await prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" } });
      return NextResponse.json({ announcements });
    } catch {
      return NextResponse.json({ announcements: [], error: "Announcements table not found — run the migration SQL in your database." }, { status: 200 });
    }
  }

  // Client (or admin impersonating with scope=client): announcements for the company.
  const effectiveId = viewing && isAdmin(user) ? viewing : user.id;
  const companyUserIds = await getCompanyUserIds(effectiveId);
  const announcements = await prisma.announcement.findMany({
    where: { userId: { in: companyUserIds } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, title, body } = await req.json();
  if (!userId || !title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Client, title and message are required" }, { status: 400 });
  }
  const announcement = await prisma.announcement.create({
    data: { userId, title: title.trim(), body: body.trim(), authorName: (session!.user as any).name || "Admin" },
  });
  return NextResponse.json({ announcement }, { status: 201 });
}
