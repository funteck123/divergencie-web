import { describe, expect, it } from "vitest";
import type { RecordingRecord } from "@/ui2/queries/recordings";
import { durationLabel, embedUrl, filterRecordings, groupByChapter, subjectsOf } from "./recordingsLogic";

const r = (o: Partial<RecordingRecord>): RecordingRecord => ({ RecordingID: "a", YouTubeId: "aaaaaaaaaaa", Title: "Quadratics 3", Level: "A Level", Subject: "Mathematics", SubjectCode: "9709", ChapterNo: 1, ChapterName: "Quadratics", Date: "2023-03-06", Batch: "B8", DurationMin: 33.3, ...o });
const rows = [
  r({ RecordingID: "1", Title: "Functions 1", ChapterNo: 2, ChapterName: "Functions", Date: "2023-03-19" }),
  r({ RecordingID: "2", Title: "Quadratics 5", Date: "2023-03-20" }),
  r({ RecordingID: "3", Title: "Quadratics 3", Date: "2023-03-06" }),
  r({ RecordingID: "4", Title: "Waves Practice 2", Subject: "Physics", SubjectCode: "9702", ChapterNo: 7, ChapterName: "Waves", Date: "2022-11-20", Batch: "" }),
];

describe("recordings logic", () => {
  it("subjects are listed alphabetically with counts", () => expect(subjectsOf(rows).map((s) => [s.label, s.count])).toEqual([["Mathematics 9709", 3], ["Physics 9702", 1]]));
  it("filters by subject and by search text", () => {
    expect(filterRecordings(rows, { q: "", subject: "9702" }).map((x) => x.RecordingID)).toEqual(["4"]);
    expect(filterRecordings(rows, { q: "quad", subject: "" }).map((x) => x.RecordingID)).toEqual(["2", "3"]);
    expect(filterRecordings(rows, { q: "b8", subject: "" }).length).toBe(3);
  });
  it("groups by subject then chapter number, and orders lessons by date", () => {
    const g = groupByChapter(rows);
    expect(g.map((x) => x.heading)).toEqual(["Chapter 1 · Quadratics", "Chapter 2 · Functions", "Chapter 7 · Waves"]);
    expect(g[0]!.rows.map((x) => x.RecordingID)).toEqual(["3", "2"]);
  });
  it("a recording without a chapter still gets a heading", () => expect(groupByChapter([r({ ChapterNo: 0, ChapterName: "" })])[0]!.heading).toBe("Other recordings"));
  it("durations read like a person would say them", () => expect([0, 33.3, 60, 70.3, 105.7].map(durationLabel)).toEqual(["", "33 min", "1 h", "1 h 10 min", "1 h 46 min"]));
  it("the embed address uses the no-cookie host and escapes the id", () => expect(embedUrl("a/b")).toBe("https://www.youtube-nocookie.com/embed/a%2Fb?rel=0&modestbranding=1"));
});
