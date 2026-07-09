import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAgencyScope } from "@/lib/agency-scope";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  if (sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const clientUser = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true },
  });

  if (!clientUser || clientUser.role !== "CLIENT") {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Enforce agency isolation: an admin may only impersonate clients in their
  // own agency (super admin may impersonate anyone).
  const scope = await getAgencyScope(session);
  if (scope.clientUserIds !== null && !scope.clientUserIds.includes(clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const cookieStore = cookies();
  cookieStore.set("adminViewingAs", clientId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 86400,
  });

  return NextResponse.json({ success: true });
}
