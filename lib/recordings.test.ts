import { describe, expect, it } from "vitest";
import { cleanRecording, subjectCodeOfService, visibleRecordings } from "./recordings";

const rec = (o: Record<string, unknown>) => cleanRecording({ YouTubeId: "abcdefghijk", Title: "Quadratics 3", SubjectCode: "9709", ...o })!;
const svc = (id: string, code: string, batches: { BatchID: string; BatchName: string }[]) => ({ ServiceID: id, Name: `Cambridge A-Level ${code} X`, SubjectCode: code, OptionalComponents: [{ Batches: batches }] });
const db = (recordings: unknown[]) => ({
  recordings,
  services: [svc("S1", "9709", [{ BatchID: "BA", BatchName: "B8" }, { BatchID: "BB", BatchName: "B4" }]), svc("S2", "9702", [{ BatchID: "BC", BatchName: "B8" }])],
  enrollments: [{ UserID: "STU-1", ServiceID: "S1", BatchID: "BA" }, { UserID: "STU-2", ServiceID: "S2", BatchID: "BC" }],
});
const student = (id: string) => ({ userId: id, userType: "Student" });

describe("cleanRecording", () => {
  it("accepts a valid record and trims it", () => expect(rec({ Title: "  Quadratics 3 " }).Title).toBe("Quadratics 3"));
  it("rejects a bad YouTube id, a missing title or a missing subject code", () => {
    expect(cleanRecording({ YouTubeId: "short", Title: "x", SubjectCode: "9709" })).toBeNull();
    expect(cleanRecording({ YouTubeId: "abcdefghijk", Title: "", SubjectCode: "9709" })).toBeNull();
    expect(cleanRecording({ YouTubeId: "abcdefghijk", Title: "x" })).toBeNull();
  });
  it("drops a malformed date instead of keeping it", () => expect(rec({ Date: "yesterday" }).Date).toBe(""));
});

describe("subjectCodeOfService", () => {
  it("uses SubjectCode, else the four digits in the name", () => {
    expect(subjectCodeOfService({ SubjectCode: "9702", Name: "x" })).toBe("9702");
    expect(subjectCodeOfService({ Name: "Cambridge A-Level 9709 Mathematics: Pure 1" })).toBe("9709");
    expect(subjectCodeOfService({ Name: "No code here" })).toBe("");
  });
});

describe("visibleRecordings", () => {
  const maths8 = rec({ YouTubeId: "aaaaaaaaaa1", Batch: "B8" });
  const maths4 = rec({ YouTubeId: "aaaaaaaaaa2", Batch: "B4" });
  const mathsAny = rec({ YouTubeId: "aaaaaaaaaa3", Batch: "" });
  const physics = rec({ YouTubeId: "aaaaaaaaaa4", SubjectCode: "9702", Batch: "" });
  const hidden = rec({ YouTubeId: "aaaaaaaaaa5", Hidden: true });
  const d = db([maths8, maths4, mathsAny, physics, hidden]);
  const ids = (s: unknown) => visibleRecordings(d, s).map((r: { RecordingID: string }) => r.RecordingID.slice(-1));
  it("a student sees only their subject and their own batch (or no batch)", () => expect(ids(student("STU-1"))).toEqual(["1", "3"]));
  it("another student sees only their own subject", () => expect(ids(student("STU-2"))).toEqual(["4"]));
  it("a student with no enrolment sees nothing", () => expect(ids(student("STU-9"))).toEqual([]));
  it("management sees everything, hidden included", () => expect(ids({ userId: "MGT-1", userType: "Management" })).toEqual(["1", "2", "3", "4", "5"]));
  it("teachers and unknown roles see nothing", () => { expect(ids({ userId: "TCH-1", userType: "Teacher" })).toEqual([]); expect(ids(null)).toEqual([]); });
});
