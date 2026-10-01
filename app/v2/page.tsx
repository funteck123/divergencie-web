"use client";

import Link from "next/link";
import { RequireUser } from "@/ui2/components/RequireUser";
import { AppShell } from "@/ui2/components/AppShell";
import styles from "./home.module.css";

export default function V2Home() {
  return (
    <RequireUser>
      {(user) => (
        <AppShell user={user}>
          <section className={styles.card}>
            <h1>New UI</h1>
            <dl className={styles.facts}>
              <div>
                <dt>Signed in as</dt>
                <dd>{user.Name}</dd>
              </div>
              <div>
                <dt>Interface</dt>
                <dd>New UI (Beta)</dd>
              </div>
              <div>
                <dt>Built so far</dt>
                <dd>Foundations</dd>
              </div>
            </dl>
            <Link href="/v2/system">Component gallery</Link>
          </section>
        </AppShell>
      )}
    </RequireUser>
  );
}
