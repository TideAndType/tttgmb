import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskDueReminderEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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
      // Dedup: only remind once per task (cleared if due date changes — see note below)
      reminderSentAt: null,
    },
    include: { user: { select: { id: true, email: true, name: true, notifyTaskDueReminder: true } } },
  });

  const portalBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let reminded = 0;

  for (const task of tasks) {
    // Always stamp so we never re-remind for this due window, even if the
    // user opted out of email — prevents the daily job from re-scanning it.
    await prisma.task.update({ where: { id: task.id }, data: { reminderSentAt: now } });

    if (task.user.notifyTaskDueReminder === false) continue;

    // In-app notification (bell)
    await createNotification(
      task.user.id,
      "task_due_reminder",
      "Task due soon",
      `"${task.title}" is due ${task.dueDate!.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
      "/tasks"
    );

    // Email notification
    if (task.user.email) {
      await sendTaskDueReminderEmail(
        task.user.email,
        task.user.name || "there",
        task.title,
        task.dueDate!,
        `${portalBase}/tasks`
      );
    }
    reminded++;
  }

  return NextResponse.json({ scanned: tasks.length, reminded });
}
