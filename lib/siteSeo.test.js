import test from "node:test";
import assert from "node:assert/strict";
import { SITE_PAGES, SERVICE_SLUGS, ROBOTS_DISALLOW, SITE_URL } from "./siteSeo.js";

test("sitemap paths are unique, absolute-path, and never inside a disallowed area", () => {
  const paths = SITE_PAGES.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of paths) {
    assert.ok(p.startsWith("/"));
    assert.ok(!ROBOTS_DISALLOW.some((d) => p === d.replace(/\$$/, "") || p.startsWith(d.endsWith("/") ? d : `${d.replace(/\$$/, "")}/`)), `${p} is disallowed in robots`);
  }
});

test("every service page in the sitemap has a title and a description of a sensible length", () => {
  for (const [slug, s] of Object.entries(SERVICE_SLUGS)) {
    assert.ok(paths().includes(`/services/${slug}`));
    assert.ok(s.name.length > 3);
    assert.ok(s.description.length >= 60 && s.description.length <= 200, `${slug} description length ${s.description.length}`);
  }
});

test("the privacy policy and terms are in the sitemap under their short public addresses", () => {
  assert.ok(paths().includes("/privacy"));
  assert.ok(paths().includes("/tos"));
  assert.equal(SITE_URL, "https://www.divergencie.co.uk");
});

function paths() {
  return SITE_PAGES.map((p) => p.path);
}
