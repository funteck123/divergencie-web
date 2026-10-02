"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireUser } from "@/ui2/components/RequireUser";

/** The new UI home is the user's own area. Management has the dashboard; other roles arrive as their phase ships. */
export default function V2Home() {
  const router = useRouter();
  return (
    <RequireUser>
      {(user) => <Redirect to={user.UserType === "Management" ? "/v2/management/accounts" : "/dashboard"} go={router.replace} />}
    </RequireUser>
  );
}

function Redirect({ to, go }: { to: string; go: (href: string) => void }) {
  useEffect(() => go(to), [to, go]);
  return <div className="u2-skeleton" style={{ height: "var(--u2-bar-height)" }} aria-busy="true" />;
}
