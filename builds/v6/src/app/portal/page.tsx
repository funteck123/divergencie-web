// This page only redirects — no UI rendered.
// force-dynamic prevents Next.js/Turbopack from attempting prerender profiling
// on a component that immediately calls redirect(), which causes the
// performance.measure negative-timestamp error (Next.js issue #86060).
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalRouter() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "management":  redirect("/portal/management");
    case "staff":       redirect("/portal/staff");
    case "teacher":     redirect("/portal/teacher");
    case "parent":      redirect("/portal/parent");
    case "ambassador":  redirect("/portal/ambassador");
    case "candidate":   redirect("/portal/candidate");
    case "student":     redirect("/portal/student");
    default:            redirect("/auth/login");
  }
}
