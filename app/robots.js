import { ROBOTS_DISALLOW, SITE_URL } from "@/lib/siteSeo";

export default function robots() {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ROBOTS_DISALLOW }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
