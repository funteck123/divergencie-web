import { SITE_PAGES, SITE_URL } from "@/lib/siteSeo";

export default function sitemap() {
  const lastModified = new Date("2026-10-14");
  return SITE_PAGES.map((p) => ({ url: `${SITE_URL}${p.path === "/" ? "" : p.path}`, lastModified, changeFrequency: p.changeFrequency, priority: p.priority }));
}
