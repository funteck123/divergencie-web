"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { RecordingLibrary } from "@/ui2/features/recordings/RecordingLibrary";

export default function RecordingsPage() {
  return (
    <RequireUser allow={["Student", "Management"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <div className="u2-accounts">
              <h1>Recording Library</h1>
              <RecordingLibrary />
            </div>
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
