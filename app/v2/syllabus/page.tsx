"use client";

import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { PortalChrome } from "@/ui2/features/portal/PortalChrome";
import { SyllabusView } from "@/ui2/features/syllabus/SyllabusView";

export default function SyllabusPage() {
  return (
    <RequireUser allow={["Student", "Teacher", "Staff", "Ambassador", "Management"]}>
      {(user) => (
        <PortalChrome>
          <AppShell user={user}>
            <h1>Syllabus Viewer</h1>
            <SyllabusView user={user} />
          </AppShell>
        </PortalChrome>
      )}
    </RequireUser>
  );
}
