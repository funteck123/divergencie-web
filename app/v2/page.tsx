"use client";

import { Skeleton } from "@/ui2/components/Skeleton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/ui2/components/RequireUser";

const HOME: Record<string, string> = {
  Management: "/v2/management/accounts", Student: "/v2/student", Teacher: "/v2/teacher", Staff: "/v2/staff", Ambassador: "/v2/ambassador", Parent: "/v2/parent",
  TrialAcc: "/v2/trial", TeacherInterviewAcc: "/v2/interview", StaffInterviewAcc: "/v2/interview", AmbassadorInterviewAcc: "/v2/interview",
};

/** The new UI home is the user's own area. Management has the dashboard; other roles arrive as their phase ships. */
export default function V2Home() {
  const router = useRouter();
  return (
    <RequireUser>
      {(user) => <Redirect to={HOME[user.UserType] ?? "/dashboard"} go={router.replace} />}
    </RequireUser>
  );
}

function Redirect({ to, go }: { to: string; go: (href: string) => void }) {
  useEffect(() => go(to), [to, go]);
  return <Skeleton height="var(--u2-bar-height)" />;
}
