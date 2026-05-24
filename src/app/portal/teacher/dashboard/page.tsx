// Redirects to the live teacher portal (this path is kept for backwards compatibility)
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
export default function TeacherDashboardRedirect() {
  redirect("/portal/teacher");
}
