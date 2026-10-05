"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

// Sonner's default "rich" colours fail WCAG contrast (white on mid green and red). Same look, readable text.
const style = {
  "--success-bg": "var(--u2-color-success-bg)", "--success-text": "var(--u2-color-on-success-bg)", "--success-border": "var(--u2-color-success)",
  "--error-bg": "var(--u2-color-error-bg)", "--error-text": "var(--u2-color-on-error-bg)", "--error-border": "var(--u2-color-error)",
  "--info-bg": "var(--u2-color-info-bg)", "--info-text": "var(--u2-color-on-info-bg)", "--info-border": "var(--u2-color-info)",
  "--warning-bg": "var(--u2-color-warning-bg)", "--warning-text": "var(--u2-color-on-warning-bg)", "--warning-border": "var(--u2-color-warning)",
} as CSSProperties;

/** The one toaster of the new UI. */
export function AppToaster() {
  return <Toaster position="bottom-right" richColors closeButton style={style} />;
}
