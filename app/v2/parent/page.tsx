"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { ParentPortal } from "@/ui2/features/portal/ParentPortal";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";

export default function ParentPage() {
  return (
    <RequireUser allow={["Parent"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <ParentPortal user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
