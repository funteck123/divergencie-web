// Client-side (browser) Sentry init — captures unhandled exceptions and
// rejected promises in the portals/admin dashboard. See instrumentation.js
// for the server-side counterpart and the shared PII-scrubbing rationale.
// NEXT_PUBLIC_SENTRY_DSN (not the plain SENTRY_DSN used server-side) is
// required here since this code ships to the browser — Next.js only
// exposes env vars prefixed NEXT_PUBLIC_ to client bundles, on purpose, so
// nothing server-only ever leaks into client JS by accident.
// TKT-0385: the Sentry SDK is about 134 KB gzipped. It used to ship in the first JavaScript of every page, which put every route over the
// 170 KB budget. It is now loaded on demand, after the page has loaded and the browser is idle (or at once when an error needs reporting).
// Until then two plain listeners keep any error that happens, and report it as soon as the SDK is ready, so nothing is lost.
// Frame filenames belonging to a browser extension's own injected script,
// not this app's code — these crash reports are unactionable (nothing we
// ship caused them) and are one of the most common sources of free-tier
// quota waste on any public-facing site.
const EXTENSION_SCHEMES = ["chrome-extension://", "moz-extension://", "safari-extension://", "safari-web-extension://"];

function isFromBrowserExtension(event) {
  const frames = event.exception?.values?.flatMap((v) => v.stacktrace?.frames || []) || [];
  return frames.some((f) => EXTENSION_SCHEMES.some((scheme) => f.filename?.startsWith(scheme)));
}


const pending = [];
const keep = (e) => { if (pending.length < 20) pending.push(e.error || e.reason || new Error(e.message || "Unknown browser error")); };
let loading = null;

/** Loads the SDK once, starts it, reports what was kept, and resolves with the Sentry module. Also used by app/v2/error.tsx. */
function loadSentry() {
  if (!loading) {
    loading = import("@sentry/nextjs").then((Sentry) => {
      window.removeEventListener("error", keep);
      window.removeEventListener("unhandledrejection", keep);
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        // See the matching comment in instrumentation.js — kept low deliberately
        // to conserve the free-tier span quota.
        tracesSampleRate: 0.05,
        sendDefaultPii: false,
        beforeSend(event) {
          if (isFromBrowserExtension(event)) return null;

          // Test runs and developers' machines (localhost) are not users: their crash reports (some are deliberate, from
          // journeys that send broken replies) would drown real ones. Seen 2026-10-18: 6 issues, all HeadlessChrome on localhost:3111.
          if (typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return null;

          // Student/staff names or emails can appear in a form field's value
          // captured alongside a validation error — strip the DOM breadcrumb
          // "value" attributes some tools attach by default; message/stack text
          // itself is left alone (that's the actual point of an error report).
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((b) => {
              if (b.data?.value) {
                const { value, ...rest } = b.data;
                return { ...b, data: rest };
              }
              return b;
            });
          }
          return event;
        },
      });
      for (const e of pending.splice(0)) Sentry.captureException(e);
      return Sentry;
    });
  }
  return loading;
}

if (typeof window !== "undefined") {
  window.addEventListener("error", keep);
  window.addEventListener("unhandledrejection", keep);
  window.__dcSentry = loadSentry;
  const start = () => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => loadSentry(), { timeout: 4000 }) : setTimeout(loadSentry, 2000));
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
