import type { Prisma } from "@prisma/client";

// Audience filter for a campaign's contacts (must have an email address).
export function audienceWhere(userId: string, status?: string | null, tag?: string | null): Prisma.ContactWhereInput {
  return {
    userId,
    email: { not: null },
    ...(status ? { status } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };
}
