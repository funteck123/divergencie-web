"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { apiFetch } from "@/ui2/queries/client";
import { logout, setCurrentUser, roleHomePath } from "@/lib/client";
import { Button } from "./Button";
import type { SessionUser } from "./RequireUser";
import styles from "./AppShell.module.css";

/**
 * Phase 0 skeleton of the two-tier shell (sketch 1A): the pinned top bar with the logo, the Beta marker, the
 * switch back to classic and Sign out. Phase 1 adds the section tabs as the second tier.
 */
export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function backToClassic() {
    setLeaving(true);
    try {
      await apiFetch("/api/me/ui-preference", { method: "PATCH", body: { preference: "classic" } });
    } catch {
      /* never trap the person in the beta: go to classic even if saving the choice failed */
    } finally {
      setCurrentUser({ ...user, UiPreference: "classic" });
      router.push(roleHomePath(user.UserType));
    }
  }

  return (
    <>
      <a className="u2-skip" href="#u2-main">
        Skip to content
      </a>
      <header className={`${styles.bar} u2-on-dark`}>
        <div className={styles.brand}>
          <Image src="/ui2/logo/logo-white-160.webp" alt="DivergenCIE Coaching" width={120} height={44} priority unoptimized />
          <span className={styles.beta}>Beta</span>
        </div>
        <div className={styles.who}>
          <span className={styles.name}>{user.Name}</span>
          <span className={styles.type}>{user.UserType}</span>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onDark loading={leaving} onClick={backToClassic}>
            Classic UI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onDark
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main id="u2-main" className={styles.main}>
        {children}
      </main>
    </>
  );
}
