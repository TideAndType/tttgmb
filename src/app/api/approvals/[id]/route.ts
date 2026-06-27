import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalRespondedEmail } from "@/lib/email";
import { createNotificationForAdmins } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = process.cwd() + "/uploads";

async function notifyApprovalResponse(
  userId: string,
  deliverableTitle: string,
  action: "approved" | "changes_requested"
) {
  try {
    const [clientUser, adminUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      prisma.user.findFirst({ where: { role: "ADMIN" }, select: { email: true, name: true } }),
    ]);
    if (adminUser && clientUser) {
      const portalUrl = process.env.NEXTAUTH_URL || "";
      await sendApprovalRespondedEmail(adminUser.email, adminUser.name, clientUser.name, deliverableTitle, action, portalUrl);
    }
  } catch (err) {
    console.error("Email notification failed:", err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, companyName: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "ADMIN" && deliverable.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ deliverable });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: params.id },
  });

  if (!deliverable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "ADMIN" && deliverable.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Admin resubmit via form data
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await mkdir(UPLOADS_DIR, { recursive: true });
      const formData = await req.formData();
      const action = formData.get("action") as string | null;
      const note = formData.get("note") as string | null;
      const file = formData.get("file") as File | null;

      if (action !== "resubmit") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      let fileUrl = deliverable.fileUrl;
      let fileName = deliverable.fileName;

      if (file && file.size > 0) {
        const ext = path.extname(file.name) || "";
        const filename = `${randomUUID()}${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filepath, buffer);
        fileUrl = filename;
        fileName = file.name;
      }

      const updated = await prisma.deliverable.update({
        where: { id: params.id },
        data: {
          status: "PENDING",
          version: deliverable.version + 1,
          fileUrl,
          fileName,
        },
      });

      await prisma.approvalComment.create({
        data: {
          deliverableId: params.id,
          authorId: user.id,
          authorName: user.name || "Admin",
          body: note || `Submitted revision v${updated.version}.`,
          action: "resubmit",
        },
      });

      return NextResponse.json({ deliverable: updated });
    } catch (error) {
      console.error("Resubmit error:", error);
      return NextResponse.json({ error: "Resubmit failed" }, { status: 500 });
    }
  }

  // JSON body — client approve / request_changes
  const body = await req.json();
  const { action, comment } = body;

  if (action === "approve") {
    if (user.role !== "CLIENT" || deliverable.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.deliverable.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    await prisma.approvalComment.create({
      data: {
        deliverableId: params.id,
        authorId: user.id,
        authorName: user.name || "Client",
        body: comment || "Approved.",
        action: "approved",
      },
    });

    await notifyApprovalResponse(user.id, deliverable.title, "approved");
    createNotificationForAdmins("approval_responded", "Deliverable approved", `${user.name ?? "Client"} approved "${deliverable.title}"`, "/admin/approvals");
    dispatchWebhook("approval.responded", { id: deliverable.id, title: deliverable.title, clientId: user.id, response: "approved" });

    return NextResponse.json({ deliverable: updated });
  }

  if (action === "request_changes") {
    if (user.role !== "CLIENT" || deliverable.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.deliverable.update({
      where: { id: params.id },
      data: { status: "CHANGES_REQUESTED" },
    });

    await prisma.approvalComment.create({
      data: {
        deliverableId: params.id,
        authorId: user.id,
        authorName: user.name || "Client",
        body: comment || "Changes requested.",
        action: "changes_requested",
      },
    });

    await notifyApprovalResponse(user.id, deliverable.title, "changes_requested");
    createNotificationForAdmins("approval_responded", "Changes requested", `${user.name ?? "Client"} requested changes on "${deliverable.title}"`, "/admin/approvals");
    dispatchWebhook("approval.responded", { id: deliverable.id, title: deliverable.title, clientId: user.id, response: "changes_requested" });

    return NextResponse.json({ deliverable: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.deliverable.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
