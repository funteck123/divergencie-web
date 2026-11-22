import { describe, expect, it } from "vitest";
import { activeFilterCount, applyFilters, distinctValues, groupDefaultKey, groupRows, readGroupDefault, toggleFilter, valueKey, writeGroupDefault, type Filters } from "./tableTools";

const rows = [
  { id: 1, course: "IGCSE", batch: "B8", n: 3 }, { id: 2, course: "A Level", batch: "B9", n: 10 }, { id: 3, course: "IGCSE", batch: "", n: 2 },
  { id: 4, course: "", batch: "B8", n: null }, { id: 5, course: "igcse ", batch: "B9", n: 1 },
];
const get = { course: (r: (typeof rows)[number]) => r.course, batch: (r: (typeof rows)[number]) => r.batch, n: (r: (typeof rows)[number]) => r.n };

describe("table tools", () => {
  it("treats blanks and padding as one value", () => {
    expect(valueKey(null)).toBe("(blank)"); expect(valueKey("  ")).toBe("(blank)"); expect(valueKey(" x ")).toBe("x"); expect(valueKey(0)).toBe("0");
  });
  it("lists distinct values with counts, natural order, blank last", () => {
    expect(distinctValues(rows, get.course)).toEqual([{ value: "A Level", count: 1 }, { value: "IGCSE", count: 2 }, { value: "igcse", count: 1 }, { value: "(blank)", count: 1 }]);
    expect(distinctValues(rows, get.n).map((d) => d.value)).toEqual(["1", "2", "3", "10", "(blank)"]);
  });
  it("filters across columns with AND, within a column with OR", () => {
    let f: Filters = {};
    f = toggleFilter(f, "course", "IGCSE");
    expect(applyFilters(rows, get, f).map((r) => r.id)).toEqual([1, 3]);
    f = toggleFilter(f, "course", "A Level");
    expect(applyFilters(rows, get, f).map((r) => r.id)).toEqual([1, 2, 3]);
    f = toggleFilter(f, "batch", "B8");
    expect(applyFilters(rows, get, f).map((r) => r.id)).toEqual([1]);
    expect(activeFilterCount(f)).toBe(2);
  });
  it("can filter for blanks", () => expect(applyFilters(rows, get, toggleFilter({}, "batch", "(blank)")).map((r) => r.id)).toEqual([3]));
  it("removing the last choice removes the filter and keeps the same rows", () => {
    const f = toggleFilter(toggleFilter({}, "course", "IGCSE"), "course", "IGCSE");
    expect(f).toEqual({}); expect(applyFilters(rows, get, f)).toBe(rows);
  });
  it("ignores a filter for a column it cannot read", () => expect(applyFilters(rows, get, { nope: new Set(["x"]) })).toBe(rows));
  it("does not change the filters it was given", () => { const f: Filters = { course: new Set(["IGCSE"]) }; toggleFilter(f, "course", "A Level"); expect([...(f.course as Set<string>)]).toEqual(["IGCSE"]); });
  it("groups keep row order inside a group", () => {
    const g = groupRows(rows, get.batch);
    expect(g.map((x) => [x.key, x.rows.map((r) => r.id)])).toEqual([["B8", [1, 4]], ["B9", [2, 5]], ["(blank)", [3]]]);
  });
});

// TKT-0428: Group by can be made the default of a table, kept in this browser.
describe("group by default", () => {
  const fake = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
  it("is empty until one is saved, and one table does not affect another", () => {
    const s = fake();
    expect(readGroupDefault(s, "Student enrollments")).toBe("");
    writeGroupDefault(s, "Student enrollments", "batch");
    expect(readGroupDefault(s, "Student enrollments")).toBe("batch");
    expect(readGroupDefault(s, "Teacher enrollments")).toBe("");
    expect(groupDefaultKey("x")).toBe("u2.groupDefault:x");
  });
  it("saving None removes the default", () => {
    const s = fake(); writeGroupDefault(s, "t", "batch"); writeGroupDefault(s, "t", "");
    expect(readGroupDefault(s, "t")).toBe(""); expect(s.m.size).toBe(0);
  });
  it("a missing or refusing storage never throws", () => {
    expect(readGroupDefault(null, "t")).toBe("");
    expect(() => writeGroupDefault(undefined, "t", "a")).not.toThrow();
    const bad = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
    expect(readGroupDefault(bad, "t")).toBe("");
    expect(() => writeGroupDefault(bad, "t", "a")).not.toThrow();
  });
});
