import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie mutations if called in server context where headers cannot be modified
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Sync database profile role/dept to user_metadata to be stored in the JWT for middleware checks
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

    return NextResponse.json({ user: data.user, session: data.session });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
