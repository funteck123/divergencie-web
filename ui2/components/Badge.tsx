import type { ReactNode } from "react";
import { clsx } from "clsx";
import "./Badge.css";

export type BadgeKind = "neutral" | "info" | "success" | "warning" | "error";

/** Small status label. Colour is never the only signal: the text always says the state. */
export function Badge({ kind = "neutral", dot = false, children }: { kind?: BadgeKind; dot?: boolean; children: ReactNode }) {
  return (
    <span className={clsx("u2-badge", `u2-badge--${kind}`)}>
      {dot && <span className="u2-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
