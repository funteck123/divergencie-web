import { describe, expect, it } from "vitest";
import { BUNDLE_MAX_AGE_MS, parseBundle, stringifyBundle } from "./bundleCache";
import type { LibraryBundle } from "@/ui2/queries/solver";

const bundle = { library: { IGCSE: { Physics: {} } }, yearly: {}, solved: {}, meta: {}, titles: {}, subjectsById: {} } as unknown as LibraryBundle;
const now = 1_800_000_000_000;

describe("bundle cache", () => {
  it("keeps a copy and gives it back", () => {
    const text = stringifyBundle(bundle, now) as string;
    const back = parseBundle(text, now + 1000);
    expect(back?.bundle.library).toEqual({ IGCSE: { Physics: {} } });
    expect(back?.at).toBe(now);
  });
  it("drops a copy older than a week, from the future, empty, damaged or without a library", () => {
    const text = stringifyBundle(bundle, now) as string;
    expect(parseBundle(text, now + BUNDLE_MAX_AGE_MS + 1)).toBeNull();
    expect(parseBundle(text, now - 3_600_000)).toBeNull();
    expect(parseBundle(null)).toBeNull();
    expect(parseBundle("{not json")).toBeNull();
    expect(parseBundle(JSON.stringify({ at: now, bundle: {} }), now)).toBeNull();
    expect(parseBundle(JSON.stringify({ at: "x", bundle }), now)).toBeNull();
  });
  it("does not keep a copy that is too big", () => {
    const big = { ...bundle, titles: Object.fromEntries(Array.from({ length: 60000 }, (_, i) => [`id${i}`, "x".repeat(60)])) } as unknown as LibraryBundle;
    expect(stringifyBundle(big, now)).toBeNull();
  });
});
