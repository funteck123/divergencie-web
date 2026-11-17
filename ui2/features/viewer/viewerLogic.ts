// Pure rules of the in-house PDF viewer (TKT-0426). No browser here, so they are tested without one.

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;

/** Clamp a zoom to the allowed range; anything that is not a number gives 1. */
export function clampScale(s: number): number {
  return Number.isFinite(s) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)) : 1;
}

/** The zoom that makes a page exactly as wide as the space it has (fit to width), never beyond the allowed range. Unknown sizes give 1. */
export function fitWidthScale(pageWidth: number, availableWidth: number): number {
  if (!(pageWidth > 0) || !(availableWidth > 0)) return 1;
  return clampScale(availableWidth / pageWidth);
}

/** Next zoom step up or down: steps of 25 per cent, kept inside the allowed range. */
export function stepScale(current: number, direction: 1 | -1): number {
  return clampScale(Math.round((clampScale(current) + direction * 0.25) * 100) / 100);
}

/** Turn what the person typed or the button asked for into a valid page number (1 to total). Not a number gives the current page. */
export function clampPage(requested: number, total: number, current = 1): number {
  if (!Number.isFinite(requested) || !(total >= 1)) return current;
  return Math.min(Math.floor(total), Math.max(1, Math.round(requested)));
}

/** "Page 3 of 120", or just the count while it is still loading. */
export function pageLabel(current: number, total: number | null): string {
  return total ? `Page ${current} of ${total}` : "Loading pages";
}

/** Which pages to draw: the ones on screen plus a few either side, so a 300-page file draws only what is needed. */
export function pagesToRender(visible: readonly number[], total: number, margin = 2): number[] {
  if (!(total >= 1) || visible.length === 0) return [];
  const lo = Math.max(1, Math.min(...visible) - margin);
  const hi = Math.min(Math.floor(total), Math.max(...visible) + margin);
  const out: number[] = [];
  for (let p = lo; p <= hi; p++) out.push(p);
  return out;
}

/** A plain-words message for a failed load; the Download button stays as the fallback. */
export function loadErrorMessage(err: unknown): string {
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (name === "PasswordException") return "This file is protected by a password, so it cannot be shown here.";
  if (name === "InvalidPDFException" || /invalid pdf/i.test(msg)) return "This file is not a readable PDF.";
  if (/401|403|not authenticated|forbidden/i.test(msg)) return "You are not signed in, or you do not have access to this file.";
  if (/404|not found|missing/i.test(msg)) return "This file could not be found.";
  return "The file could not be loaded. Check your connection and try again, or download it instead.";
}
