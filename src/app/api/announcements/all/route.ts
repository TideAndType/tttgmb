import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Admin-only: every announcement, no scoping or impersonation logic. Used by the
// /admin/announcements management page so it always lists what was published.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ announcements: [], error: `Not an admin session (role: ${role ?? "none"}).` }, { status: 200 });
  }
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ announcements, role, total: announcements.length });
  } catch (e: any) {
    return NextResponse.json({ announcements: [], error: `DB error: ${e?.message || "unknown"} — has the Announcement table been created?` }, { status: 200 });
  }
}
