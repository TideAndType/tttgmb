import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalNeededEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getCompanyUserIds } from "@/lib/company";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.cwd() + "/uploads";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  if (user.role === "ADMIN") {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    const deliverables = await prisma.deliverable.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, companyName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ deliverables });
  }

  // CLIENT: all deliverables for their company
  const companyUserIds = await getCompanyUserIds(user.id);
  const where: any = { userId: { in: companyUserIds } };
  if (statusFilter) where.status = statusFilter;
  const deliverables = await prisma.deliverable.findMany({
    where,
    include: { _count: { select: { comments: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ deliverables });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as any;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const formData = await req.formData();
    const userId = formData.get("userId") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file && file.size > 0) {
      const ext = path.extname(file.name) || "";
      const filename = `${randomUUID()}${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);
      fileUrl = filename;
      fileName = file.name;
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        userId,
        title,
        description: description || null,
        type: (type as any) || "OTHER",
        fileUrl,
        fileName,
      },
    });

    try {
      const clientUser = await prisma.user.findUnique({ where: { id: userId } });
      if (clientUser) {
        createNotification(userId, "approval_needed", "New deliverable to review", title, "/approvals");
        if (clientUser.notifyApprovalNeeded) {
          const portalUrl = `${process.env.NEXTAUTH_URL || ""}/approvals`;
          await sendApprovalNeededEmail(clientUser.email, clientUser.name, title, deliverable.type, portalUrl);
        }
      }
    } catch (err) {
      console.error("Email notification failed:", err);
    }

    return NextResponse.json({ deliverable }, { status: 201 });
  } catch (error) {
    console.error("Create deliverable error:", error);
    return NextResponse.json({ error: "Failed to create deliverable" }, { status: 500 });
  }
}
