import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

// Impersonation-aware effective client user id: when an admin/super-admin is
// viewing a client (adminViewingAs cookie), operate on that client; otherwise
// the signed-in user. Returns null when unauthenticated.
export async function effectiveUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const u = session.user as any;
  const viewing = cookies().get("adminViewingAs")?.value;
  const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
  return isAdmin && viewing ? viewing : u.id;
}
