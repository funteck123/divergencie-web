import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user as any;
  const { pathname } = req.nextUrl;
  const isPortalPage = pathname.startsWith("/portal");

  if (isPortalPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
  }

  if (isLoggedIn && isPortalPage) {
    const role = user?.role?.toLowerCase();

    if (pathname.startsWith("/portal/student")) {
      if (role !== "student")
        return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }

    if (pathname.startsWith("/portal/teacher") && role !== "teacher") {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }

    if (pathname.startsWith("/portal/parent") && role !== "parent") {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }

    if (pathname.startsWith("/portal/ambassador") && role !== "ambassador") {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }

    if (pathname.startsWith("/portal/candidate") && role !== "candidate") {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }

    if (pathname.startsWith("/portal/staff")) {
      if (role !== "staff" && role !== "management") {
        return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
      }
      const segments = pathname.split("/");
      const deptSegment = segments[3];
      const depts = ["finance", "hr", "it", "marketing", "pr"];
      if (depts.includes(deptSegment?.toLowerCase())) {
        const userDept = user?.dept?.toLowerCase();
        if (role !== "management" && userDept !== deptSegment.toLowerCase()) {
          return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
        }
      }
    }

    if (pathname.startsWith("/portal/management") && role !== "management") {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/portal/:path*"],
};
