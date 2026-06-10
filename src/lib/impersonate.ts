import { cookies } from "next/headers";

export function getEffectiveUserId(sessionUser: { id: string; role: string }): string {
  if (sessionUser.role !== "ADMIN") return sessionUser.id;
  const cookieStore = cookies();
  const viewing = cookieStore.get("adminViewingAs");
  return viewing?.value ?? sessionUser.id;
}
