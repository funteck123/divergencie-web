"use client";

import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { roleHomePath } from "@/lib/client";
import { newUiAvailableFor } from "@/lib/uiPreference";

export interface SessionUser {
  UserID: string;
  UserType: string;
  Name: string;
  UiPreference?: string;
}

const STORAGE_KEY = "dcp1_user"; // same key the classic client uses (lib/client.js)

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
const readStored = () => window.localStorage.getItem(STORAGE_KEY);
// undefined = still on the server or hydrating: nothing is known yet.
const readOnServer = () => undefined;

function parseUser(raw: string | null | undefined): SessionUser | null | undefined {
  if (raw === undefined) return undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Same guard as the classic dashboards: the stored user decides, the API enforces the real permission.
 * Not signed in goes to /login; an account type the new UI does not cover yet goes to its classic home.
 */
export function RequireUser({ children }: { children: (user: SessionUser) => ReactNode }) {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribe, readStored, readOnServer);
  const user = useMemo(() => parseUser(raw), [raw]);
  const allowed = !!user && newUiAvailableFor(user.UserType);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.replace("/login");
    else if (!allowed) router.replace(roleHomePath(user.UserType));
  }, [user, allowed, router]);

  if (!user || !allowed) return <div className="u2-skeleton" style={{ height: "var(--u2-bar-height)" }} aria-busy="true" />;
  return <>{children(user)}</>;
}
