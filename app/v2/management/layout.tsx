"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppToaster } from "@/ui2/components/AppToaster";
import { AdminWhite } from "@/ui2/components/AdminWhite";
import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { IssuedProvider } from "@/ui2/features/management/IssuedCredentials";
import { MANAGEMENT_TABS } from "@/ui2/features/management/tabs";

export default function ManagementLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUser allow={["Management"]}>
      {(user) => (
        <NuqsAdapter>
          <IssuedProvider>
            <AdminWhite />
            <AppShell user={user} tabs={MANAGEMENT_TABS}>
              {children}
            </AppShell>
            <AppToaster />
          </IssuedProvider>
        </NuqsAdapter>
      )}
    </RequireUser>
  );
}
