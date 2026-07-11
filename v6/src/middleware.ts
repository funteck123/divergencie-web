import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let supabaseResponse = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before any redirect checks.
  const { data: { user } } = await supabase.auth.getUser();

  if (!pathname.startsWith("/portal")) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/auth/login", req.nextUrl);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role is stored in user_metadata (synced on login) and also used for coarse gating here.
  // Fine-grained RBAC is enforced server-side in each route/action.
  const role = (user.user_metadata?.role as string | undefined)?.toLowerCase() || "";
  const dept = (user.user_metadata?.dept as string | undefined)?.toLowerCase() || "";

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, req.nextUrl));

  if (pathname.startsWith("/portal/student") && role !== "student") return redirect("/unauthorized");
  if (pathname.startsWith("/portal/teacher") && role !== "teacher") return redirect("/unauthorized");
  if (pathname.startsWith("/portal/parent") && role !== "parent") return redirect("/unauthorized");
  if (pathname.startsWith("/portal/ambassador") && role !== "ambassador") return redirect("/unauthorized");
  if (pathname.startsWith("/portal/candidate") && role !== "candidate") return redirect("/unauthorized");

  if (pathname.startsWith("/portal/staff")) {
    if (role !== "staff" && role !== "management") return redirect("/unauthorized");
    const segments = pathname.split("/");
    const deptSegment = segments[3]?.toLowerCase();
    const depts = ["finance", "hr", "it", "marketing", "pr"];
    if (depts.includes(deptSegment) && role !== "management" && dept !== deptSegment) {
      return redirect("/unauthorized");
    }
  }

  if (pathname.startsWith("/portal/management") && role !== "management") return redirect("/unauthorized");

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*"],
};
