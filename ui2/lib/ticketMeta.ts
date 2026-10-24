/** What the browser knows about the screen a ticket is raised on. The server keeps only known keys, cut to a safe size, and adds the browser string and the build. */
interface NetworkInformation {
  effectiveType?: string;
}

export function collectTicketMeta(): Record<string, unknown> {
  const root = document.documentElement;
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  const themeAttr = root.getAttribute("data-theme");
  return {
    page: `${window.location.pathname}${window.location.search}`,
    title: document.title,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    dpr: window.devicePixelRatio || 1,
    scrollY: Math.round(window.scrollY),
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: themeAttr === "dark" || themeAttr === "light" ? themeAttr : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    ui: "new",
    net: nav.connection?.effectiveType,
    online: navigator.onLine,
    touch: window.matchMedia("(pointer: coarse)").matches,
    capturedAt: new Date().toISOString(),
  };
}
