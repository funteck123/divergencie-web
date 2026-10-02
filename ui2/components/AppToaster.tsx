"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

// Sonner's default "rich" colours fail WCAG contrast (white on mid green and red). Same look, readable text.
const style = {
  "--success-bg": "var(--u2-color-success-bg)", "--success-text": "#0B3D24", "--success-border": "var(--u2-color-success)",
  "--error-bg": "var(--u2-color-error-bg)", "--error-text": "#7A1F15", "--error-border": "var(--u2-color-error)",
  "--info-bg": "var(--u2-color-info-bg)", "--info-text": "#1F4A6B", "--info-border": "var(--u2-color-info)",
  "--warning-bg": "var(--u2-color-warning-bg)", "--warning-text": "#4A3F12", "--warning-border": "var(--u2-color-warning)",
} as CSSProperties;

/** The one toaster of the new UI. */
export function AppToaster() {
  return <Toaster position="bottom-right" richColors closeButton style={style} />;
}
