"use client";

import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { AppShell } from "@/ui2/components/AppShell";
import { RequireUser } from "@/ui2/components/RequireUser";
import { IssuedProvider } from "@/ui2/features/management/IssuedCredentials";
import { MANAGEMENT_TABS } from "@/ui2/features/management/tabs";

export default function ManagementLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUser>
      {(user) => (
        <NuqsAdapter>
          <IssuedProvider>
            <AppShell user={user} tabs={MANAGEMENT_TABS}>
              {children}
            </AppShell>
            <Toaster position="bottom-right" richColors closeButton />
          </IssuedProvider>
        </NuqsAdapter>
      )}
    </RequireUser>
  );
}
