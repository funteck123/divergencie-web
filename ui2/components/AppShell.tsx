"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { getImpersonatorInfo, logout, roleHomePath, setCurrentUser, setImpersonatorInfo } from "@/lib/client";
import { useMediaQuery } from "@/ui2/lib/useMediaQuery";
import { apiFetch } from "@/ui2/queries/client";
import { Button } from "./Button";
import { useInstallApp } from "./InstallApp";
import { ReportIssueDialog } from "./ReportIssue";
import { RowMenu, type RowMenuItem } from "./RowMenu";
import type { SessionUser } from "./RequireUser";
import styles from "./AppShell.module.css";

export interface ShellTab {
  href: string;
  label: string;
}

const subscribeNever = () => () => {};
/** Who is really signed in when an admin is "logging in as" this account (kept in this browser, set by the classic and new Log in as). */
const useImpersonator = () => {
  const raw = useSyncExternalStore(subscribeNever, () => JSON.stringify(getImpersonatorInfo()), () => "null");
  return JSON.parse(raw) as { userId: string; name: string } | null;
};

/**
 * Two-tier shell (sketch 1A): the pinned top bar with the logo, the Beta marker, the person, Report an Issue, Install app,
 * the switch back to classic and Sign out; the optional second tier holds the section tabs. On a phone the actions fold
 * into one menu. An admin viewing as someone else always sees the amber banner with Stop impersonating.
 */
export function AppShell({ user, tabs, children }: { user: SessionUser; tabs?: readonly ShellTab[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const phone = useMediaQuery("(max-width: 639px)");
  const impersonator = useImpersonator();
  const install = useInstallApp();
  const [leaving, setLeaving] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [reporting, setReporting] = useState(false);

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
  async function stopImpersonating() {
    setStopping(true);
    try {
      const { user: admin } = await apiFetch<{ user: { UserType: string } }>("/api/impersonate", { method: "DELETE" });
      setCurrentUser(admin);
      setImpersonatorInfo(null);
      router.push(roleHomePath(admin.UserType));
    } catch (e) {
      setStopping(false);
      toast.error(`Couldn't stop impersonating: ${e instanceof Error ? e.message : "try again"}`);
    }
  }
  const signOut = () => {
    logout();
    router.push("/login");
  };

  const menu: RowMenuItem[] = [
    { label: "Report an Issue", onSelect: () => setReporting(true) },
    ...(install.available ? [{ label: "Install app", onSelect: () => void install.run() }] : []),
    { label: leaving ? "Opening classic…" : "Classic UI", onSelect: () => void backToClassic() },
    { label: "Sign out", onSelect: signOut },
  ];

  return (
    <>
      <a className="u2-skip" href="#u2-main">
        Skip to content
      </a>
      {impersonator && (
        <div className={styles.imp} role="status">
          <span>
            Viewing as <strong>{user.Name}</strong> ({user.UserType}), logged in by {impersonator.name}, not this account&apos;s own password.
          </span>
          <Button size="sm" variant="ghost" onDark loading={stopping} onClick={() => void stopImpersonating()}>
            Stop impersonating
          </Button>
        </div>
      )}
      <header className={`${styles.bar} u2-on-dark`} style={impersonator ? { top: 0 } : undefined}>
        <div className={styles.brand}>
          <Image src="/ui2/logo/logo-white-160.webp" alt="DivergenCIE Coaching" width={120} height={44} priority unoptimized />
          <span className={styles.beta}>Beta</span>
        </div>
        <div className={styles.who}>
          <span className={styles.name}>{user.Name}</span>
          <span className={styles.type}>{user.UserType}</span>
        </div>
        <div className={styles.actions}>
          {phone ? (
            <>
              {/* One tap, not two (TKT-0329): reporting a problem must not hide inside the menu. */}
              <Button variant="ghost" size="sm" onDark onClick={() => setReporting(true)}>
                Report issue
              </Button>
              <RowMenu label="Menu" trigger="Menu ▾" items={menu.filter((i) => i.label !== "Report an Issue")} />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onDark onClick={() => setReporting(true)}>
                Report an Issue
              </Button>
              {install.available && (
                <Button variant="ghost" size="sm" onDark onClick={() => void install.run()}>
                  Install app
                </Button>
              )}
              <Button variant="ghost" size="sm" onDark loading={leaving} onClick={() => void backToClassic()}>
                Classic UI
              </Button>
              <Button variant="ghost" size="sm" onDark onClick={signOut}>
                Sign out
              </Button>
            </>
          )}
        </div>
      </header>
      {tabs && (
        <nav className={styles.tabs} aria-label="Sections">
          {tabs.map((t) => {
            const current = pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link key={t.href} href={t.href} className={styles.tab} aria-current={current ? "page" : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      )}
      <main id="u2-main" className={styles.main} style={{ ["--u2-sticky-top" as string]: tabs ? "calc(var(--u2-bar-height) + 53px)" : "var(--u2-bar-height)" }}>
        {children}
      </main>
      <ReportIssueDialog open={reporting} onOpenChange={setReporting} />
      {install.help}
    </>
  );
}
