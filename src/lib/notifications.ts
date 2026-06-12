import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch (err) {
    console.error("[Notification] createNotification failed:", err);
  }
}

export async function createNotificationForAdmins(
  type: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, type, title, body, link })),
    });
  } catch (err) {
    console.error("[Notification] createNotificationForAdmins failed:", err);
  }
}
