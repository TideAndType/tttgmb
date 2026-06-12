import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskDueReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueDate: { gte: now, lte: in48h },
      visibleToClient: true,
    },
    include: { user: { select: { email: true, name: true } } },
  });

  const portalBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let reminded = 0;

  for (const task of tasks) {
    if (!task.user.email) continue;
    await sendTaskDueReminderEmail(
      task.user.email,
      task.user.name || "there",
      task.title,
      task.dueDate!,
      `${portalBase}/portal/tasks`
    );
    reminded++;
  }

  return NextResponse.json({ reminded });
}
