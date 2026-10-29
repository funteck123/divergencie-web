"use client";

import { useEffect, useState } from "react";
import { Button } from "@/ui2/components/Button";
import { roleHomePath } from "@/lib/client";

/**
 * Any crash inside the new UI lands here instead of on a blank page. It is sent to Sentry (same project as classic, tagged
 * `ui: v2` so Beta errors can be told apart), and the person can retry or go back to the classic UI, which always works.
 */
export default function V2Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    // The SDK is loaded on demand (instrumentation-client.js, TKT-0385), so it is not in this route's JavaScript.
    const load = (window as unknown as { __dcSentry?: () => Promise<typeof import("@sentry/nextjs")> }).__dcSentry ?? (() => import("@sentry/nextjs"));
    void load().then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setTag("ui", "v2");
        Sentry.captureException(error);
      });
    });
  }, [error]);

  async function classic() {
    setLeaving(true);
    let home = "/login";
    try {
      const raw = window.localStorage.getItem("dcp1_user");
      if (raw) {
        const user = JSON.parse(raw) as { UserType: string };
        // Classic reads this copy to decide which UI to open, so it must say classic before the path is worked out.
        window.localStorage.setItem("dcp1_user", JSON.stringify({ ...user, UiPreference: "classic" }));
        home = roleHomePath(user.UserType);
      }
      await fetch("/api/me/ui-preference", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preference: "classic" }) });
    } catch {
      /* never trap anyone in the Beta: go to classic even if saving the choice failed */
    }
    window.location.assign(home);
  }

  return (
    <main style={{ display: "grid", gap: "var(--u2-space-3)", maxWidth: 520, margin: "0 auto", padding: "var(--u2-space-6) var(--u2-space-4)" }} role="alert">
      <h1>This page hit a problem</h1>
      <p>The team has been told. Nothing you saved was lost. Try again, or use the classic UI, which has every feature.</p>
      <div className="u2-rowactions">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <Button variant="ghost" loading={leaving} onClick={() => void classic()}>Use the classic UI</Button>
      </div>
      {error.digest && <p className="u2-muted">Reference: {error.digest}</p>}
    </main>
  );
}
