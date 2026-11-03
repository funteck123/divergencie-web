import { describe, expect, it } from "vitest";
import type { RecordingRecord } from "@/ui2/queries/recordings";
import { courseKeyOf, courseLabel, coursesOf, durationLabel, embedUrl, filterRecordings, groupByChapter, neighbours } from "./recordingsLogic";

const r = (o: Partial<RecordingRecord>): RecordingRecord => ({ RecordingID: "a", YouTubeId: "aaaaaaaaaaa", Title: "Quadratics 3", Level: "A Level", Subject: "Mathematics", SubjectCode: "9709", Component: "Pure Mathematics 1", ChapterNo: 1, ChapterName: "Quadratics", Date: "2023-03-06", Batch: "B8", DurationMin: 33.3, ...o });
const pure = (id: string, title: string, chNo: number, ch: string, date: string) => r({ RecordingID: id, Title: title, ChapterNo: chNo, ChapterName: ch, Date: date });
const rows = [
  pure("1", "Functions 1", 2, "Functions", "2023-03-19"),
  pure("2", "Quadratics 5", 1, "Quadratics", "2023-03-20"),
  pure("3", "Quadratics 3", 1, "Quadratics", "2023-03-06"),
  r({ RecordingID: "4", Title: "Representation of data 2", Component: "Probability and Statistics 1", ChapterNo: 1, ChapterName: "Representation of data", Date: "2023-03-16" }),
  r({ RecordingID: "5", Title: "Waves Practice 2", Subject: "Physics", SubjectCode: "9702", Component: "", ChapterNo: 7, ChapterName: "Waves", Date: "2022-11-20", Batch: "" }),
];

describe("recordings logic", () => {
  it("two components of 9709 are two courses, each named with its component", () => {
    expect(coursesOf(rows).map((c) => [c.label, c.count])).toEqual([
      ["A Level Mathematics 9709 · Pure Mathematics 1", 3],
      ["A Level Mathematics 9709 · Probability and Statistics 1", 1],
      ["A Level Physics 9702", 1],
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    expect(courseKeyOf(rows[0]!)).not.toBe(courseKeyOf(rows[3]!));
  });
  it("a subject without a component has a plain label", () => expect(courseLabel(rows[4]!)).toBe("A Level Physics 9702"));
  it("shows one course only", () => {
    expect(filterRecordings(rows, { q: "", course: courseKeyOf(rows[0]!) }).map((x) => x.RecordingID)).toEqual(["1", "2", "3"]);
    expect(filterRecordings(rows, { q: "", course: courseKeyOf(rows[3]!) }).map((x) => x.RecordingID)).toEqual(["4"]);
  });
  it("search narrows inside the course", () => expect(filterRecordings(rows, { q: "quad", course: courseKeyOf(rows[0]!) }).map((x) => x.RecordingID)).toEqual(["2", "3"]));
  it("chapters in syllabus order, lessons by date", () => {
    const g = groupByChapter(filterRecordings(rows, { q: "", course: courseKeyOf(rows[0]!) }));
    expect(g.map((x) => x.heading)).toEqual(["Chapter 1 · Quadratics", "Chapter 2 · Functions"]);
    expect(g[0]!.rows.map((x) => x.RecordingID)).toEqual(["3", "2"]);
  });
  it("a recording without a chapter still gets a heading", () => expect(groupByChapter([r({ ChapterNo: 0, ChapterName: "" })])[0]!.heading).toBe("Other recordings"));
  it("previous and next walk across chapters", () => {
    const g = groupByChapter(filterRecordings(rows, { q: "", course: courseKeyOf(rows[0]!) }));
    expect(neighbours(g, "3")).toMatchObject({ prev: undefined, index: 0, total: 3 });
    expect(neighbours(g, "3").next?.RecordingID).toBe("2");
    expect(neighbours(g, "2").next?.RecordingID).toBe("1");
    expect(neighbours(g, "1").next).toBeUndefined();
    expect(neighbours(g, "1").prev?.RecordingID).toBe("2");
  });
  it("durations read like a person would say them", () => expect([0, 33.3, 60, 70.3, 105.7].map(durationLabel)).toEqual(["", "33 min", "1 h", "1 h 10 min", "1 h 46 min"]));
  it("the embed address uses the no-cookie host and escapes the id", () => expect(embedUrl("a/b")).toBe("https://www.youtube-nocookie.com/embed/a%2Fb?rel=0&modestbranding=1"));
});
