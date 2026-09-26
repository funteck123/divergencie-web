"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, roleHomePath } from "@/lib/client";

// TKT-0281: the installed app's start_url (see app/manifest.js). One fixed
// address cannot know which dashboard a person should land on, so this
// decides on open: a signed-in person goes to their own dashboard, anyone
// else to the login page. Same signed-in check DashboardShell itself uses.
export default function AppLaunch() {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    router.replace(user ? roleHomePath(user.UserType) : "/login");
  }, [router]);
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p style={{ color: "var(--muted)" }}>Loading…</p>
    </main>
  );
}
