import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { getAgencyScope } from "@/lib/agency-scope";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

function effectiveId(session: any): string {
  const u = session.user as any;
  const v = cookies().get("adminViewingAs")?.value;
  return v && isAdmin(u) ? v : u.id;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;

  // Admin (not impersonating) managing the list, optionally per client.
  if (isAdmin(user) && !viewing) {
    const clientId = req.nextUrl.searchParams.get("clientId");
    const scope = await getAgencyScope(session);
    let where: any = clientId ? { userId: clientId } : {};
    if (scope.clientUserIds !== null) {
      where = clientId && scope.clientUserIds.includes(clientId) ? { userId: clientId } : { userId: { in: scope.clientUserIds } };
    }
    const checkIns = await prisma.checkIn.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ checkIns });
  }

  // Client / impersonating admin: active check-ins for the company + recent answers.
  const companyUserIds = await getCompanyUserIds(effectiveId(session));
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const checkIns = await prisma.checkIn.findMany({
    where: { userId: { in: companyUserIds }, active: true },
    orderBy: { createdAt: "desc" },
    include: { answers: { where: { date: { gte: new Date(since.toISOString().split("T")[0]) } }, orderBy: { date: "desc" } } },
  });
  return NextResponse.json({ checkIns, me: effectiveId(session) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, prompt, cadence } = await req.json();
  if (!userId || !prompt?.trim()) return NextResponse.json({ error: "Client and prompt are required" }, { status: 400 });
  const checkIn = await prisma.checkIn.create({
    data: { userId, prompt: prompt.trim(), cadence: cadence || "weekdays" },
  });
  return NextResponse.json({ checkIn }, { status: 201 });
}
