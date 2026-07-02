// Per-feature privileges for client team members.
//
// Backward-compatibility rule: an EMPTY permissions array means "full access".
// This keeps every pre-existing user (and the company owner) unrestricted —
// restrictions only apply once an admin/owner explicitly grants a subset.

export interface PermissionDef {
  key: string;
  label: string;
  /** route prefixes this permission gates (used by middleware + nav) */
  paths: string[];
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "dashboard", label: "Dashboard", paths: ["/dashboard"] },
  { key: "marketing", label: "Marketing OS", paths: ["/marketing"] },
  { key: "proposals", label: "Proposals", paths: ["/proposals"] },
  { key: "projects", label: "Projects", paths: ["/projects"] },
  { key: "tasks", label: "Tasks", paths: ["/tasks"] },
  { key: "approvals", label: "Approvals", paths: ["/approvals"] },
  { key: "invoices", label: "Invoices", paths: ["/invoices"] },
  { key: "files", label: "Files", paths: ["/files"] },
  { key: "reports", label: "Reports & Analytics", paths: ["/reports", "/seo", "/keywords", "/ai-visibility", "/gmb"] },
  { key: "brand", label: "Brand Book", paths: ["/brand-book"] },
  { key: "messages", label: "Messages", paths: ["/messages"] },
  { key: "meetings", label: "Meetings", paths: ["/meetings"] },
  { key: "calendar", label: "Calendar & Timeline", paths: ["/calendar", "/timeline"] },
  { key: "time", label: "Time Tracking", paths: ["/time"] },
  { key: "forms", label: "Forms", paths: ["/forms"] },
  { key: "activity", label: "Activity", paths: ["/activity"] },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** True if the user may access the given permission key. Empty list = full access. */
export function hasPermission(permissions: string[] | null | undefined, key: string): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.includes(key);
}

/** Resolve the permission key that gates a given pathname, or null if none. */
export function permissionForPath(pathname: string): string | null {
  for (const p of PERMISSIONS) {
    if (p.paths.some((base) => pathname === base || pathname.startsWith(base + "/"))) {
      return p.key;
    }
  }
  return null;
}
