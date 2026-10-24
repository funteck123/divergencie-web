// What a ticket records about the situation it was raised in. The browser reports it (so treat it as a hint, never as proof of who someone is: the sender
// of a ticket always comes from the session), and the server adds what only it can know. Only the keys below are kept, each cut to a safe size.
const text = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const num = (v, min, max) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v * 100) / 100 : undefined);
const size = (v) => {
  const m = /^(\d{2,5})x(\d{2,5})$/.exec(String(v || ""));
  return m ? `${m[1]}x${m[2]}` : "";
};

/** Reduce what the browser sent to the known keys. Anything else, or any value of the wrong type, is dropped. */
export function sanitizeMeta(raw) {
  const m = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {
    page: text(m.page, 300),
    title: text(m.title, 120),
    viewport: size(m.viewport),
    screen: size(m.screen),
    dpr: num(m.dpr, 0.5, 8),
    scrollY: num(m.scrollY, 0, 1e6),
    lang: text(m.lang, 20),
    tz: text(m.tz, 60),
    theme: ["light", "dark"].includes(m.theme) ? m.theme : "",
    ui: ["new", "classic"].includes(m.ui) ? m.ui : "",
    net: ["slow-2g", "2g", "3g", "4g"].includes(m.net) ? m.net : "",
    online: typeof m.online === "boolean" ? m.online : undefined,
    touch: typeof m.touch === "boolean" ? m.touch : undefined,
    capturedAt: Number.isFinite(Date.parse(m.capturedAt)) ? new Date(m.capturedAt).toISOString() : "",
  };
  for (const k of Object.keys(out)) if (out[k] === "" || out[k] === undefined) delete out[k];
  return out;
}

/** What the server adds: the browser string as the request carried it, the deployed version, and when it arrived. */
export function serverMeta(req) {
  return {
    userAgent: text(req.headers.get("user-agent"), 300),
    build: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
    receivedAt: new Date().toISOString(),
  };
}
