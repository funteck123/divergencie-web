"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui2/components/Button";

const storageKey = (key: string) => `u2-default-view:${key}`;
const read = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(storageKey(key)); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try { if (value) window.localStorage.setItem(storageKey(key), value); else window.localStorage.removeItem(storageKey(key)); } catch { /* private mode: the default lasts for this visit only */ }
};

/**
 * Remember which view a person prefers (TKT-0332). On first load, if the page was opened without a view in its address and a
 * default is saved, `apply` switches to it. `current` is the view on screen; `fallback` is the page's own starting view.
 */
export function useDefaultView(key: string, current: string, fallback: string, apply: (view: string) => void) {
  const [saved, setSaved] = useState<string | null>(() => read(key));
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (saved && saved !== fallback && current === fallback) apply(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on arrival
  }, []);
  return {
    isDefault: saved === current || (saved === null && current === fallback),
    saved,
    set: () => { write(key, current); setSaved(current); },
    clear: () => { write(key, null); setSaved(null); },
  };
}

/** One small button next to a view switcher: makes the view on screen the one you come back to. */
export function DefaultViewButton({ state }: { state: ReturnType<typeof useDefaultView> }) {
  const pinned = state.saved !== null && state.isDefault;
  return (
    <Button size="sm" variant="ghost" aria-pressed={pinned} title={pinned ? "This is your default view. Press to go back to the standard one." : "Open this view every time you come back"} onClick={pinned ? state.clear : state.set}>
      {pinned ? "Default view ✓" : "Make default"}
    </Button>
  );
}
