import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes - only for admins
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
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
        pathname.startsWith("/messages")) &&
      token?.role !== "CLIENT"
    ) {
      // Allow admins through if they have the impersonation cookie set
      if (token?.role === "ADMIN" && req.cookies.get("adminViewingAs")?.value) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/seo/:path*", "/keywords/:path*", "/brand-book/:path*", "/reports/:path*", "/gmb", "/gmb/:path*", "/tasks/:path*", "/calendar", "/calendar/:path*", "/projects/:path*", "/time/:path*", "/approvals/:path*", "/proposals/:path*", "/invoices/:path*", "/profile/:path*", "/timeline", "/timeline/:path*", "/messages", "/messages/:path*", "/api/team", "/api/calendar-events", "/api/search", "/api/notifications", "/api/notifications/:path*"],
};
