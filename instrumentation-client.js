// Client-side (browser) Sentry init — captures unhandled exceptions and
// rejected promises in the portals/admin dashboard. See instrumentation.js
// for the server-side counterpart and the shared PII-scrubbing rationale.
// NEXT_PUBLIC_SENTRY_DSN (not the plain SENTRY_DSN used server-side) is
// required here since this code ships to the browser — Next.js only
// exposes env vars prefixed NEXT_PUBLIC_ to client bundles, on purpose, so
// nothing server-only ever leaks into client JS by accident.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
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
