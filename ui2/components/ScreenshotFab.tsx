"use client";

import { useState } from "react";
import { captureScreen, SKIP_ATTRIBUTE } from "@/ui2/lib/captureScreen";
import { collectTicketMeta } from "@/ui2/lib/ticketMeta";
import "./ScreenshotFab.css";

/**
 * A small, quiet button in the corner: one tap takes a picture of exactly what the person is looking at, records the page and device details at that
 * moment, and only then hands both to the report dialog, which opens ready for the description. The button marks itself to be left out of the picture.
 * If the picture cannot be made, the dialog still opens (with no picture) so the report is never lost.
 */
export function ScreenshotFab({ onCapture }: { onCapture: (shot: string | null, meta: Record<string, unknown>) => void }) {
  const [busy, setBusy] = useState(false);

  async function take() {
    if (busy) return;
    setBusy(true);
    const meta = collectTicketMeta(); // the page and scroll position as they are now, before anything opens
    const shot = await captureScreen();
    setBusy(false);
    onCapture(shot, meta);
  }

  return (
    <button
      type="button"
      className="u2-shotfab"
      {...{ [SKIP_ATTRIBUTE]: "" }}
      aria-label="Take a screenshot and report an issue"
      title="Screenshot and report an issue"
      disabled={busy}
      aria-busy={busy}
      onClick={() => void take()}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </button>
  );
}
