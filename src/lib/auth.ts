import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import prisma from "@/lib/db";

export async function getSession() {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch role/dept from Prisma (single source of truth)
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true, dept: true, name: true },
  });
  if (!dbUser) return null;

  return {
    user: {
      id: dbUser.id,
      email: user.email,
      role: dbUser.role,
      dept: dbUser.dept,
      name: dbUser.name,
    },
  };
}

export const auth = getSession;
