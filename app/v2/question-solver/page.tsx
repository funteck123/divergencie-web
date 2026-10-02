"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { SolverView } from "@/ui2/features/solver/SolverView";

export default function QuestionSolverPage() {
  return (
    <RequireUser allow={["Student", "Teacher", "Staff", "Ambassador", "Management"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <h1>Question Solver</h1>
            <SolverView user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
