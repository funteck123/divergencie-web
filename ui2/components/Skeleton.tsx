import type { CSSProperties } from "react";

/** The shimmering placeholder shown while data loads. Height is the one thing a screen sets, so it is a prop, not an inline style on the page. */
export function Skeleton({ height, label }: { height: number | string; label?: string }) {
  const style: CSSProperties = { height };
  return <div className="u2-skeleton" style={style} aria-busy="true" aria-label={label} />;
}
