import { describe, expect, it } from "vitest";
import { cleanRecording, componentKey, subjectCodeOfService, visibleRecordings } from "./recordings";

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

describe("components (Pure 1 and Statistics 1 are both 9709)", () => {
  it("componentKey reads both naming styles and ignores other text", () => {
    expect(componentKey("Pure Mathematics 1")).toBe("pure 1");
    expect(componentKey("Cambridge A-Level 9709 Mathematics: Pure 1")).toBe("pure 1");
    expect(componentKey("Probability and Statistics 1")).toBe("statistics 1");
    expect(componentKey("Cambridge A-Level 9709 Mathematics: Statistics 1")).toBe("statistics 1");
    expect(componentKey("Cambridge A-Level 9702 Physics")).toBe("");
  });
  const pure = cleanRecording({ YouTubeId: "bbbbbbbbbb1", Title: "Quadratics 3", SubjectCode: "9709", Component: "Pure Mathematics 1" })!;
  const stats = cleanRecording({ YouTubeId: "bbbbbbbbbb2", Title: "Representation of data 2", SubjectCode: "9709", Component: "Probability and Statistics 1" })!;
  const plain = cleanRecording({ YouTubeId: "bbbbbbbbbb3", Title: "Waves", SubjectCode: "9702" })!;
  const d = {
    recordings: [pure, stats, plain],
    services: [
      { ServiceID: "P1", Name: "Cambridge A-Level 9709 Mathematics: Pure 1", SubjectCode: "9709", OptionalComponents: [{ Batches: [{ BatchID: "B", BatchName: "B8" }] }] },
      { ServiceID: "MA", Name: "Cambridge A-Level 9709 Mathematics", SubjectCode: "9709", OptionalComponents: [{ Batches: [{ BatchID: "B", BatchName: "B8" }] }] },
    ],
    enrollments: [{ UserID: "STU-P", ServiceID: "P1", BatchID: "B" }, { UserID: "STU-M", ServiceID: "MA", BatchID: "B" }],
  };
  const ids = (u: string) => visibleRecordings(d, { userId: u, userType: "Student" }).map((r: { RecordingID: string }) => r.RecordingID.slice(-1));
  it("a Pure 1 student does not see Statistics 1 recordings", () => expect(ids("STU-P")).toEqual(["1"]));
  it("a student whose course names no component sees every component of the subject", () => expect(ids("STU-M")).toEqual(["1", "2"]));
  it("the component is kept on the record", () => expect(pure.Component).toBe("Pure Mathematics 1"));
});
