// TKT-0281: makes the site installable ("Install app" in Chrome/Edge, "Add to
// Home Screen" on iPhone). No service worker on purpose -- installability does
// not need one, and a service worker that caches pages can serve a stale site
// after a deploy or keep another person's data on a shared device. Nothing is
// available offline; the installed app is the same site in its own window.
export default function manifest() {
  return {
    id: "/",
    name: "DivergenCIE Coaching",
    short_name: "DivergenCIE",
    description: "Your DivergenCIE portal: schedule, attendance, resources and the Question Solver.",
    // /app sends a signed-in person to their own dashboard and everyone else
    // to the login page (see app/app/page.js).
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a3c5e",
    lang: "en",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
