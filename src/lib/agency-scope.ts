import { prisma } from "@/lib/prisma";

export interface AgencyScope {
  superAdmin: boolean;
  agencyId: string | null;
  // CLIENT user ids this admin may see. null = unrestricted (super admin).
  clientUserIds: string[] | null;
}

// Resolve which clients an admin session is allowed to see.
// - SUPER_ADMIN: everything (unrestricted).
// - ADMIN: only clients in their own agency. For backward compatibility, when
//   just ONE agency exists (single-tenant deployments), legacy clients with no
//   agencyId are also included so nothing disappears.
export async function getAgencyScope(session: any): Promise<AgencyScope> {
  const u = session?.user;
  const role = u?.role;
  if (role === "SUPER_ADMIN") return { superAdmin: true, agencyId: null, clientUserIds: null };
  if (role !== "ADMIN") return { superAdmin: false, agencyId: null, clientUserIds: [] };

  const me = await prisma.user.findUnique({ where: { id: u.id }, select: { agencyId: true } });
  let agencyId = me?.agencyId ?? null;
  if (!agencyId) {
    const owned = await prisma.agency.findFirst({ where: { ownerId: u.id }, select: { id: true } });
    agencyId = owned?.id ?? null;
  }

  const totalAgencies = await prisma.agency.count();
  const includeUnassigned = totalAgencies <= 1;

  const where: any = agencyId
    ? (includeUnassigned ? { role: "CLIENT", OR: [{ agencyId }, { agencyId: null }] } : { role: "CLIENT", agencyId })
    : { role: "CLIENT", ...(includeUnassigned ? {} : { agencyId: "__none__" }) };

  const clients = await prisma.user.findMany({ where, select: { id: true } });
  return { superAdmin: false, agencyId, clientUserIds: clients.map((c) => c.id) };
}

// Convenience: a Prisma `where` filter fragment for `userId` scoped to the
// admin's clients (returns {} for super admin = no restriction).
export function scopedUserIdFilter(scope: AgencyScope): Record<string, unknown> {
  if (scope.clientUserIds === null) return {};
  return { userId: { in: scope.clientUserIds } };
}
