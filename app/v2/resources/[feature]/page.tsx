"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { ResourceFeature } from "@/ui2/features/portal/ResourceFeature";

export default function ResourcePage() {
  return (
    <RequireUser allow={["Student", "Teacher", "Staff", "Ambassador"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <ResourceFeature />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
