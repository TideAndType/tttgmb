import { prisma } from "@/lib/prisma";

// Returns all userIds in the same company as the given userId.
// If the user has no companyId, returns just [userId].
export async function getCompanyUserIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) return [userId];
  const members = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: { id: true },
  });
  return members.map((m) => m.id);
}

// Returns the "primary" userId for a company — the oldest member.
// Used for OAuth tokens (GSC, GA, GMB) which are tied to a specific user.
export async function getPrimaryUserId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) return userId;
  const primary = await prisma.user.findFirst({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return primary?.id ?? userId;
}
