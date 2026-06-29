import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyUserIds } from "@/lib/company";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAdmin(u: any) {
  return u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const answererId = viewing && isAdmin(u) ? viewing : u.id;

  const checkIn = await prisma.checkIn.findUnique({ where: { id: params.id } });
  if (!checkIn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The answerer must belong to the check-in's company.
  const companyUserIds = await getCompanyUserIds(checkIn.userId);
  if (!companyUserIds.includes(answererId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Answer required" }, { status: 400 });

  const today = new Date(new Date().toISOString().split("T")[0]);
  const answerer = await prisma.user.findUnique({ where: { id: answererId }, select: { name: true } });

  const answer = await prisma.checkInAnswer.upsert({
    where: { checkInId_userId_date: { checkInId: params.id, userId: answererId, date: today } },
    create: { checkInId: params.id, userId: answererId, authorName: answerer?.name || "Team member", body: body.trim(), date: today },
    update: { body: body.trim() },
  });
  return NextResponse.json({ answer });
}
