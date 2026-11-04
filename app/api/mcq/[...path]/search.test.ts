import { beforeEach, describe, expect, it, vi } from "vitest";

// TKT-0237: the real proxy route, with a fake session, a fake database and a fake search service. The point of the test is access: a student
// must never get question text from a subject they are not enrolled in, whatever the search service returns.
const state = { session: { userId: "STU-1", userType: "Student" } as { userId: string; userType: string }, upstream: [] as unknown[], upstreamStatus: 200, calledUrl: "" };
vi.mock("@/lib/authz", () => ({ requireSession: () => ({ session: state.session, error: null }) }));
vi.mock("@/lib/mcqConfig", () => ({ getMcqExtractionUrl: async () => "http://svc" }));
vi.mock("@/lib/db", () => ({
  readDB: async () => ({
    enrollments: [
      { UserID: "STU-1", ServiceID: "S-PHY" },
      { UserID: "STU-1", ServiceID: "S-OLD", EndDate: "2020-01-01" },
      { UserID: "STU-2", ServiceID: "S-CHEM" },
    ],
    services: [
      { ServiceID: "S-PHY", Course: "IGCSE", SubjectName: "Physics" },
      { ServiceID: "S-OLD", Course: "IGCSE", SubjectName: "Chemistry" },
      { ServiceID: "S-CHEM", Course: "A-Level", SubjectName: "Chemistry" },
    ],
  }),
}));

import { GET } from "./route";

const hit = (board: string, subject: string, n: number) => ({ qpId: `${subject}-${n}`, questionNumber: String(n), board, subject, snippet: "x" });
const get = (q = "bound") => GET(new Request(`http://x/api/mcq/search?q=${q}`) as never, { params: Promise.resolve({ path: ["search"] }) });

beforeEach(() => {
  state.session = { userId: "STU-1", userType: "Student" };
  state.upstreamStatus = 200;
  state.upstream = [];
  vi.stubGlobal("fetch", async (url: string) => { state.calledUrl = url; return new Response(JSON.stringify({ total: (state.upstream as unknown[]).length, results: state.upstream }), { status: state.upstreamStatus, headers: { "Content-Type": "application/json" } }); });
});

describe("question search proxy", () => {
  it("passes the query to the service", async () => {
    await get("upper%20bound");
    expect(state.calledUrl).toBe("http://svc/api/search?q=upper%20bound");
  });
  it("a student only gets hits from subjects they are enrolled in right now", async () => {
    state.upstream = [hit("IGCSE", "Physics", 1), hit("IGCSE", "Chemistry", 2) /* enrollment ended */, hit("A Levels", "Chemistry", 3), hit("IGCSE", "Physics", 4)];
    const body = await (await get()).json();
    expect(body.results.map((r: { qpId: string }) => r.qpId)).toEqual(["Physics-1", "Physics-4"]);
    expect(body.total).toBe(2);
  });
  it("a different student's enrollment does not leak to this one", async () => {
    state.session = { userId: "STU-2", userType: "Student" };
    state.upstream = [hit("IGCSE", "Physics", 1), hit("A Levels", "Chemistry", 3)];
    const body = await (await get()).json();
    expect(body.results.map((r: { qpId: string }) => r.qpId)).toEqual(["Chemistry-3"]);
  });
  it("a student with no enrollment gets nothing", async () => {
    state.session = { userId: "STU-9", userType: "Student" };
    state.upstream = [hit("IGCSE", "Physics", 1)];
    expect((await (await get()).json()).results).toEqual([]);
  });
  it("Management sees every subject", async () => {
    state.session = { userId: "MGT-1", userType: "Management" };
    state.upstream = [hit("IGCSE", "Physics", 1), hit("IGCSE", "Chemistry", 2), hit("A Levels", "Biology", 3)];
    expect((await (await get()).json()).results.length).toBe(3);
  });
  it("keeps the best 30 after filtering", async () => {
    state.session = { userId: "MGT-1", userType: "Management" };
    state.upstream = Array.from({ length: 80 }, (_, i) => hit("IGCSE", "Physics", i));
    const body = await (await get()).json();
    expect(body.results.length).toBe(30);
    expect(body.results[0].qpId).toBe("Physics-0");
  });
  it("a service error passes through untouched", async () => {
    state.upstreamStatus = 503;
    const res = await get();
    expect(res.status).toBe(503);
  });
});
