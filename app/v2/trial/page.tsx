"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { TrialPortal } from "@/ui2/features/portal/TrialInterviewPortals";

export default function TrialPortalPage() {
  return (
    <RequireUser allow={["TrialAcc"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <TrialPortal user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
