"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { InterviewPortal } from "@/ui2/features/portal/TrialInterviewPortals";

export default function InterviewPortalPage() {
  return (
    <RequireUser allow={["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <InterviewPortal user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
