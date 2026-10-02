"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { RolePortal } from "@/ui2/features/portal/RolePortal";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";

export default function AmbassadorPage() {
  return (
    <RequireUser allow={["Ambassador"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <RolePortal role="Ambassador" user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
