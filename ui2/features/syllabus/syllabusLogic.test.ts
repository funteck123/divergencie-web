import { describe, expect, it } from "vitest";
import { chapterOf, exportHtml, flattenTagged, groupByLevel, imageSrc, leaderboardScope, parseContentBlocks, parseTagStore, runningTotals, withTag, type SyllabusMeta, type TopicNode } from "./syllabusLogic";

const list: SyllabusMeta[] = [
  { filename: "a.json", subject: "Physics", level: "IGCSE", code: "0625", cycle: "2026" },
  { filename: "b.json", subject: "Biology", level: "A Level", code: "9700", cycle: "2026" },
  { filename: "c.json", subject: "Maths", level: "IGCSE", code: "0580", cycle: "2026" },
];

describe("syllabus list", () => {
  it("groups by level, IGCSE first, and filters by subject or code", () => {
    expect(groupByLevel(list, "").map((g) => [g.level, g.items.length])).toEqual([["IGCSE", 2], ["A Level", 1]]);
    expect(groupByLevel(list, "bio").map((g) => g.level)).toEqual(["A Level"]);
    expect(groupByLevel(list, "0580")[0]?.items[0]?.subject).toBe("Maths");
    expect(groupByLevel(list, "zzz")).toEqual([]);
  });
  it("encodes image paths segment by segment", () => expect(imageSrc("IGCSE/Physics/1 Motion/p 1.png")).toBe("/api/syllabus/images/IGCSE/Physics/1%20Motion/p%201.png"));
});

describe("topic text", () => {
  it("reads labels, bullets, lettered parts and paragraphs, and drops empty bullets", () => {
    const b = parseContentBlocks("[Core]\n• speed\n• \n(a)\tdistance\nPlain line\n• later");
    expect(b).toEqual([{ type: "label", text: "Core" }, { type: "list", items: ["speed", "(a)\tdistance"] }, { type: "para", text: "Plain line" }, { type: "list", items: ["later"] }]);
    expect(parseContentBlocks("")).toEqual([]);
  });
});

describe("tags", () => {
  it("sets and clears a tag without leaving blanks behind", () => {
    let s = withTag({}, "a.json", "0.1", "revise", true);
    s = withTag(s, "a.json", "0.1", "doubt", true);
    expect(s).toEqual({ "a.json": { "0.1": { revise: true, doubt: true } } });
    s = withTag(s, "a.json", "0.1", "revise", false);
    s = withTag(s, "a.json", "0.1", "doubt", false);
    expect(s).toEqual({});
  });
  it("does not change the store it was given", () => {
    const s = withTag({}, "a", "0", "revise", true);
    withTag(s, "a", "0", "revise", false);
    expect(s).toEqual({ a: { "0": { revise: true } } });
  });
  it("survives broken storage", () => { expect(parseTagStore("{oops")).toEqual({}); expect(parseTagStore(null)).toEqual({}); expect(parseTagStore("[1]")).toEqual([1]); });
});

describe("export", () => {
  const tree: TopicNode[] = [{ code: "1", title: "Motion", depth: 0, children: [{ code: "1.1", title: "Speed <fast>", depth: 1 }] }, { title: "Forces", depth: 0 }];
  it("walks the tree by path and keeps topics tagged more than once", () => {
    let s = withTag({}, "a.json", "0.0", "revise", true);
    s = withTag(s, "a.json", "0.0", "doubt", true);
    s = withTag(s, "a.json", "1", "completed", true);
    const flat = flattenTagged(tree, s, "a.json");
    expect(flat.map((t) => t.title)).toEqual(["Speed <fast>", "Forces"]);
    const html = exportHtml({ subject: "Physics", code: "0625" }, "a.json", flat, "Friday");
    expect(html).toContain("Physics (0625)");
    expect(html).toContain("Speed &lt;fast&gt;");
    expect(html.match(/Speed &lt;fast&gt;/g)?.length).toBe(2);
    expect(html).toContain('style="--c:#1f9d55"');
    expect(html).not.toContain("No topics tagged yet");
  });
  it("says so when nothing is tagged", () => expect(exportHtml({ subject: "P", code: "" }, "a", [], "x")).toContain("No topics tagged yet"));
});

describe("progress", () => {
  const all = [
    { account_id: "me", subject: "a.json", node_key: "0.1" }, { account_id: "me", subject: "b.json", node_key: "2.0" },
    { account_id: "x", subject: "a.json", node_key: "0.3" }, { account_id: "x", subject: "a.json", node_key: "1.0" },
  ];
  it("takes the chapter from the first part of the node key", () => { expect(chapterOf("3.2.1")).toBe("3"); expect(chapterOf("")).toBeNull(); });
  it("splits mine from others inside a scope", () => {
    expect(runningTotals(all, { subject: "", chapter: "" }, "me").mine).toHaveLength(2);
    const r = runningTotals(all, { subject: "a.json", chapter: "0" }, "me");
    expect(r.mine).toHaveLength(1);
    expect(Object.keys(r.others)).toEqual(["x"]);
    expect(r.others.x).toHaveLength(1);
  });
  it("picks leaderboard rows by scope", () => {
    const lb = { overall: [{ accountId: "a", name: "A", topicsCompleted: 5 }], bySubject: { "a.json": [{ accountId: "b", name: "B", topicsCompleted: 2 }] }, byChapter: { "a.json": { "0": [{ accountId: "c", name: "C", topicsCompleted: 1 }] } } };
    expect(leaderboardScope(lb, { subject: "", chapter: "" })[0]?.name).toBe("A");
    expect(leaderboardScope(lb, { subject: "a.json", chapter: "" })[0]?.name).toBe("B");
    expect(leaderboardScope(lb, { subject: "a.json", chapter: "0" })[0]?.name).toBe("C");
    expect(leaderboardScope(lb, { subject: "zz", chapter: "9" })).toEqual([]);
  });
});
