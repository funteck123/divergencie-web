import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component contexts can ignore cookie mutations
            }
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync the user's role/dept from DB to user_metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const prisma = (await import("@/lib/db")).default;
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase().trim() },
          select: { role: true, dept: true, subGroup: true },
        });
        if (dbUser) {
          const SUBGROUP_PREFIX_TO_DEPT: Record<string, string> = {
            HR: "HR", IT: "IT", FIN: "Finance", PR: "PR", MKT: "Marketing",
          };
          const resolvedDept = dbUser.dept
            ?? SUBGROUP_PREFIX_TO_DEPT[dbUser.subGroup?.split("_")[0] ?? ""]
            ?? "";

          await supabase.auth.updateUser({
            data: {
              role: dbUser.role || "",
              dept: resolvedDept,
            },
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If error, redirect to login page with error query param
  return NextResponse.redirect(`${origin}/auth/login?error=Could not exchange auth code for session`);
}
