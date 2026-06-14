import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPortalPage = pathname.startsWith("/portal");

  if (!isPortalPage) {
    return NextResponse.next();
  }

  // Initialize Supabase client response object
  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
  }

  const role = (user.user_metadata?.role as string | undefined)?.toLowerCase() || "";
  const dept = (user.user_metadata?.dept as string | undefined)?.toLowerCase() || "";

  if (pathname.startsWith("/portal/student") && role !== "student") {
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
      if (role !== "management" && dept !== deptSegment.toLowerCase()) {
        return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
      }
    }
  }

  if (pathname.startsWith("/portal/management") && role !== "management") {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*"],
};
