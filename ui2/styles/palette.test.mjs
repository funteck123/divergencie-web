import test from "node:test";
import assert from "node:assert/strict";
import { TOKENS, REQUIRED_PAIRS, BRAND, BREAKPOINTS, contrast, mix } from "./palette.mjs";
import { buildTokensCss } from "../../scripts/build-tokens.mjs";
import fs from "fs";

test("every required text and control pair passes WCAG 2.1 AA", () => {
  const failures = [];
  for (const [fg, bg, min, label] of REQUIRED_PAIRS) {
    assert.ok(TOKENS[fg], `unknown token ${fg}`);
    assert.ok(TOKENS[bg], `unknown token ${bg}`);
    const ratio = contrast(TOKENS[fg], TOKENS[bg]);
    if (ratio < min) failures.push(`${label}: ${fg} on ${bg} = ${ratio.toFixed(2)} (needs ${min})`);
  }
  assert.deepEqual(failures, []);
});

test("brand colours keep the exact Brand Design Guidelines hex codes", () => {
  assert.equal(BRAND.navy, "#1A3C5E");
  assert.equal(BRAND.gold, "#E8A832");
  assert.equal(BRAND.sky, "#4A9FD4");
  assert.equal(BRAND.coral, "#E05A4E");
  assert.equal(BRAND.charcoal, "#5C5248");
  assert.equal(TOKENS["color-surface-tint"], "#D5E8F0");
  assert.equal(TOKENS["color-surface-warm"], "#FFF8E7");
});

test("the guideline combinations that fail AA are not used as text pairs", () => {
  assert.ok(contrast("#FFFFFF", BRAND.gold) < 4.5, "white on gold must stay out");
  assert.ok(contrast(BRAND.sky, "#FFFFFF") < 4.5, "sky text on white must stay out");
  assert.ok(contrast(BRAND.coral, "#FFFFFF") < 4.5, "coral text on white must stay out");
  assert.equal(TOKENS["color-on-accent"], BRAND.navy);
  assert.equal(TOKENS["color-link"], BRAND.navy);
});

test("pure black is never a token (guideline)", () => {
  for (const [k, v] of Object.entries(TOKENS)) assert.ok(!/^#0{6}$/i.test(v), `${k} is pure black`);
});

test("spacing tokens are multiples of 4 px", () => {
  for (const [k, v] of Object.entries(TOKENS)) if (k.startsWith("space-")) assert.equal(parseInt(v) % 4, 0, k);
});

test("breakpoints match the Mockup Guide", () => {
  assert.deepEqual(BREAKPOINTS, { sm: 480, md: 768, lg: 1024, xl: 1280 });
});

test("mix helper", () => {
  assert.equal(mix("#000000", "#FFFFFF", 0.5), "#808080");
  assert.equal(mix("#112233", "#112233", 0.4), "#112233");
});

test("committed tokens.css matches the generator", () => {
  const css = fs.readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
  assert.equal(css, buildTokensCss());
});
