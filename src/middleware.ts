import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { PERMISSIONS, permissionForPath, hasPermission } from "@/lib/permissions";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Super admin routes
    if (pathname.startsWith("/super-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin routes - only for admins and super admins
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Client routes - only for clients (or admins who are impersonating)
    if (
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/seo") ||
        pathname.startsWith("/keywords") ||
        pathname.startsWith("/brand-book") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/gmb") ||
        pathname.startsWith("/tasks") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/time") ||
        pathname.startsWith("/approvals") ||
        pathname.startsWith("/proposals") ||
        pathname.startsWith("/invoices") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/timeline") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/support") ||
        pathname.startsWith("/files")) &&
      token?.role !== "CLIENT"
    ) {
      // Allow admins/super-admins through if they have the impersonation cookie set
      if ((token?.role === "ADMIN" || token?.role === "SUPER_ADMIN") && req.cookies.get("adminViewingAs")?.value) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Per-feature privileges for client team members. Empty permissions = full access.
    if (token?.role === "CLIENT") {
      const perms = (token.permissions as string[] | undefined) ?? [];
      if (perms.length > 0) {
        const required = permissionForPath(pathname);
        if (required && !hasPermission(perms, required)) {
          // Redirect to the first section they CAN access (or /profile, which is ungated).
          const firstAllowed = PERMISSIONS.find((p) => perms.includes(p.key));
          const target = firstAllowed ? firstAllowed.paths[0] : "/profile";
          return NextResponse.redirect(new URL(target, req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token?.id,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/super-admin/:path*", "/dashboard/:path*", "/seo/:path*", "/keywords/:path*", "/brand-book/:path*", "/reports/:path*", "/gmb", "/gmb/:path*", "/ai-visibility", "/ai-visibility/:path*", "/tasks/:path*", "/calendar", "/calendar/:path*", "/projects/:path*", "/time/:path*", "/approvals/:path*", "/proposals/:path*", "/invoices/:path*", "/profile/:path*", "/timeline", "/timeline/:path*", "/messages", "/messages/:path*", "/meetings", "/meetings/:path*", "/files", "/files/:path*", "/forms", "/forms/:path*", "/support", "/support/:path*", "/activity", "/activity/:path*", "/api/files", "/api/files/:path*", "/api/team", "/api/calendar-events", "/api/search", "/api/notifications", "/api/notifications/:path*"],
};
