export { default } from "next-auth/middleware";

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

    // Client routes - only for clients
    if (
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/seo") ||
        pathname.startsWith("/keywords") ||
        pathname.startsWith("/brand-book")) &&
      token?.role !== "CLIENT"
    ) {
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
  matcher: ["/admin/:path*", "/dashboard/:path*", "/seo/:path*", "/keywords/:path*", "/brand-book/:path*"],
};
