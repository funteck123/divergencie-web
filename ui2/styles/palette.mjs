// New UI colour tokens: the single source of truth (planning/new-ui-migration-plan.md section 3.0).
// Brand colours are the Brand Design Guidelines v1.0 hex codes. A few derived steps (fixed mixes of
// brand colours, documented below) and three semantic colours the guidelines do not define
// (success, error, and a text-safe info blue) are added so every text pair passes WCAG 2.1 AA.
// Light theme only (decided 2026-10-02). Tokens are named by role, never by colour.

/** @param {string} hex */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** @param {number[]} c */
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
/** Mix: a * (1 - t) + b * t. */
export const mix = (a, b, t) => {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A.map((v, i) => v * (1 - t) + B[i] * t));
};
const luminance = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG contrast ratio of two hex colours. */
export const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ---- Brand Design Guidelines v1.0 (exact hex codes) ----
export const BRAND = {
  navy: "#1A3C5E",
  gold: "#E8A832",
  sky: "#4A9FD4",
  coral: "#E05A4E",
  charcoal: "#5C5248",
  lightBlue: "#D5E8F0",
  lightGold: "#FFF8E7",
  offWhite: "#F4F4F4",
  text: "#1A1A1A",
  white: "#FFFFFF",
};

// ---- Semantic colours the guidelines lack (values from the Mockup Guide v2) ----
const SUCCESS = "#1A7A4A";
const ERROR = "#C0392B";

/** Role tokens (CSS custom properties, without the --u2- prefix). Order is the output order. */
export const TOKENS = {
  // surfaces
  "color-bg": BRAND.white,
  "color-bg-subtle": BRAND.offWhite,
  "color-surface": BRAND.white,
  "color-surface-tint": BRAND.lightBlue, // table header rows, info boxes
  "color-surface-warm": BRAND.lightGold, // featured content, announcements
  "color-selected": mix(BRAND.white, BRAND.navy, 0.08), // selected row, hover row
  // text
  "color-text": BRAND.text,
  "color-text-muted": "#666666", // guideline caption colour
  "color-text-inverse": BRAND.white,
  // brand actions
  "color-brand": BRAND.navy,
  "color-brand-hover": mix(BRAND.navy, "#0A1A2B", 0.35),
  "color-on-brand": BRAND.white,
  "color-accent": BRAND.gold, // primary call to action fill
  "color-accent-hover": mix(BRAND.gold, BRAND.navy, 0.12),
  "color-on-accent": BRAND.navy, // guideline says white text: 2.08:1 fails, navy text is 5.44:1
  "color-link": BRAND.navy, // guideline says sky blue: 2.92:1 fails; links are navy and underlined
  // text on the tinted status backgrounds (toasts, banners): each passes AA on its tint
  "color-on-success-bg": "#0B3D24",
  "color-on-error-bg": "#7A1F15",
  "color-on-info-bg": "#1F4A6B",
  "color-on-warning-bg": "#4A3F12",
  // impersonation bar, scrims behind dialogs and sheets, outlines on navy
  "color-impersonate": "#92400E",
  "color-scrim": "rgba(26, 26, 26, 0.45)",
  "color-scrim-light": "rgba(26, 26, 26, 0.35)",
  "color-on-brand-line": "rgba(255, 255, 255, 0.55)",
  "color-on-brand-wash": "rgba(255, 255, 255, 0.12)",
  // status
  "color-info": BRAND.sky, // fill, dot, icon (never small text)
  "color-info-text": mix(BRAND.sky, BRAND.navy, 0.55),
  "color-info-bg": mix(BRAND.white, BRAND.sky, 0.18),
  "color-success": SUCCESS,
  "color-success-bg": mix(BRAND.white, SUCCESS, 0.12),
  "color-warning": BRAND.gold, // fill, dot, icon
  "color-warning-text": BRAND.charcoal, // brand colour, 7.62:1 on white
  "color-warning-bg": BRAND.lightGold,
  "color-error": ERROR, // text and danger button fill (coral at 3.66:1 is fill only)
  "color-error-bg": mix(BRAND.white, ERROR, 0.1),
  "color-coral": BRAND.coral, // decorative fill, dots, bars
  "color-charcoal": BRAND.charcoal,
  // lines
  "color-border": "#D6DEE7", // decorative dividers (not interactive, exempt from 3:1)
  "color-border-strong": "#7B8794", // input and control borders, 3.66:1 on white
  "color-focus": BRAND.navy, // used with a 2 px white gap, see base.css
  // spacing (8 px grid, multiples of 4)
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-6": "24px",
  "space-8": "32px",
  "space-12": "48px",
  "space-16": "64px",
  // radius
  "radius-xs": "2px",
  "radius-sm": "4px",
  "radius-md": "8px",
  "radius-lg": "12px",
  "radius-xl": "20px",
  "radius-full": "9999px",
  "radius-round": "50%",
  // type (dense UI scale inside the guideline family)
  "font-sans": 'var(--font-inter), Inter, Arial, Helvetica, sans-serif',
  "text-2xs": "11px",
  "text-xs": "12px",
  "text-sm": "13px",
  "text-md": "14px",
  "text-lg": "16px",
  "text-xl": "20px",
  "text-2xl": "24px",
  "text-3xl": "28px",
  "text-display": "32px",
  "weight-regular": "400",
  "weight-medium": "500",
  "weight-semibold": "600",
  "weight-bold": "700",
  "leading-tight": "1.2",
  "leading-ui": "1.45",
  "leading-reading": "1.6",
  // layout
  "bar-height": "56px",
  "tab-height": "40px",
  "row-height": "34px",
  "touch-target": "44px",
  // motion (Mockup Guide v2 section 9)
  "motion-fast": "150ms",
  "motion-base": "200ms",
  "motion-page": "250ms",
  "motion-toast": "300ms",
  "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  // elevation (navy-tinted, never black)
  "shadow-sm": "0 1px 2px rgba(26, 60, 94, 0.12)",
  "shadow-md": "0 4px 12px rgba(26, 60, 94, 0.16)",
  "shadow-lg": "0 12px 32px rgba(26, 60, 94, 0.2)",
  // layers
  "z-bar": "100",
  "z-sheet": "200",
  "z-popover": "300",
  "z-toast": "400",
};

/** Mockup Guide v2 section 6 breakpoints (CSS cannot use variables in media queries, so JS exports them). */
export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024, xl: 1280 };

/**
 * Text and control pairs that must pass WCAG 2.1 AA. [foreground token, background token, minimum ratio, label].
 * 4.5 for text, 3 for large text and non-text controls.
 */
export const REQUIRED_PAIRS = [
  ["color-text", "color-bg", 4.5, "body text"],
  ["color-text", "color-bg-subtle", 4.5, "body text on subtle"],
  ["color-text", "color-surface-tint", 4.5, "body text on tint"],
  ["color-text", "color-surface-warm", 4.5, "body text on warm"],
  ["color-text", "color-selected", 4.5, "body text on selected row"],
  ["color-text-muted", "color-bg", 4.5, "muted text"],
  ["color-text-muted", "color-bg-subtle", 4.5, "muted text on subtle"],
  ["color-text-muted", "color-surface-tint", 4.5, "muted text on tint"],
  ["color-text-muted", "color-surface-warm", 4.5, "muted text on warm"],
  ["color-text-muted", "color-selected", 4.5, "muted text on selected row"],
  ["color-on-brand", "color-brand", 4.5, "text on navy"],
  ["color-on-brand", "color-brand-hover", 4.5, "text on navy hover"],
  ["color-on-accent", "color-accent", 4.5, "text on gold button"],
  ["color-on-accent", "color-accent-hover", 4.5, "text on gold button hover"],
  ["color-link", "color-bg", 4.5, "link"],
  ["color-link", "color-surface-tint", 4.5, "link on tint"],
  ["color-info-text", "color-bg", 4.5, "info text"],
  ["color-info-text", "color-info-bg", 4.5, "info text on info background"],
  ["color-info-text", "color-surface-tint", 4.5, "info text on tint"],
  ["color-success", "color-bg", 4.5, "success text"],
  ["color-success", "color-success-bg", 4.5, "success text on success background"],
  ["color-warning-text", "color-bg", 4.5, "warning text"],
  ["color-warning-text", "color-warning-bg", 4.5, "warning text on warning background"],
  ["color-on-success-bg", "color-success-bg", 4.5, "toast text on success tint"],
  ["color-on-error-bg", "color-error-bg", 4.5, "toast text on error tint"],
  ["color-on-info-bg", "color-info-bg", 4.5, "toast text on info tint"],
  ["color-on-warning-bg", "color-warning-bg", 4.5, "toast text on warning tint"],
  ["color-on-brand", "color-impersonate", 4.5, "text on the impersonation bar"],
  ["color-error", "color-bg", 4.5, "error text"],
  ["color-error", "color-error-bg", 4.5, "error text on error background"],
  ["color-error", "color-surface-warm", 4.5, "error text on warm"],
  ["color-text-inverse", "color-error", 4.5, "text on danger button"],
  ["color-text-inverse", "color-charcoal", 4.5, "text on charcoal"],
  ["color-border-strong", "color-bg", 3, "input border (non-text)"],
  ["color-border-strong", "color-bg-subtle", 3, "input border on subtle (non-text)"],
  ["color-focus", "color-bg", 3, "focus ring (non-text)"],
];
