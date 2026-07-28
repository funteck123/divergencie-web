// Server-side Sentry init — see instrumentation-client.js for the browser
// counterpart. Both stay silent (SDK no-ops) if SENTRY_DSN isn't set, so
// this file is safe to ship before the env var exists.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // sendDefaultPii OFF on purpose — this app handles student/staff
      // names, emails, invoice amounts, WhatsApp numbers. Sentry's default
      // is to attach request headers/cookies/IP automatically; we don't
      // want any of that leaving the server. beforeSend below is a second,
      // explicit layer on top of this for known-sensitive fields.
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });
  }
}

// Captures errors thrown during request handling (App Router route
// handlers, Server Components, Server Actions) that Next.js's own error
// boundary would otherwise only log to the runtime console.
export const onRequestError = async (...args) => {
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
};
