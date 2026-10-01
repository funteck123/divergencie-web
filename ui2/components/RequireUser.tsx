"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, roleHomePath } from "@/lib/client";
import { newUiAvailableFor } from "@/lib/uiPreference";

export interface SessionUser {
  UserID: string;
  UserType: string;
  Name: string;
  UiPreference?: string;
}

/**
 * Same guard as the classic dashboards: the stored user decides, the API enforces the real permission.
 * Not signed in goes to /login; an account type the new UI does not cover yet goes to its classic home.
 */
export function RequireUser({ children }: { children: (user: SessionUser) => ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = checking
  useEffect(() => {
    const u = getCurrentUser() as SessionUser | null;
    if (!u) router.replace("/login");
    else if (!newUiAvailableFor(u.UserType)) router.replace(roleHomePath(u.UserType));
    else setUser(u);
  }, [router]);
  if (!user) return <div className="u2-skeleton" style={{ height: "var(--u2-bar-height)" }} aria-busy="true" />;
  return <>{children(user)}</>;
}
