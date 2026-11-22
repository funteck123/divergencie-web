import { afterEach, describe, expect, it, vi } from "vitest";

// TKT-0420: the proxy answers from the saved copy only when the live Question Solver cannot be reached, and only for a person who may open the paper.
const state = { session: { userId: "STU-1", userType: "Student" }, url: "https://live.example" as string | null, saved: null as null | { papers: Record<string, unknown>; library: unknown } };
const STORED = { questions: [{ questionNumber: "1", image: "data:image/avif;base64,AAAA", optionLetters: ["A", "B"], correctAnswer: "A" }], ambiguousAnswerKey: [] };
const LIB = { IGCSE: { Physics: { "Paper 2": [{ qpId: "QPID_PHYS_1", title: "Ch1.1 WS1" }, { qpId: "QPID_PHYS_2", title: "Ch1.2 WS1" }] } } };

vi.mock("@/lib/authz", () => ({ requireSession: () => ({ session: state.session, error: null }) }));
vi.mock("@/lib/mcqConfig", () => ({ getMcqExtractionUrl: async () => state.url }));
vi.mock("@/lib/db", () => ({ readDB: async () => ({ enrollments: [{ UserID: "STU-1", ServiceID: "SVC-1", StartDate: "2020-01-01" }], services: [{ ServiceID: "SVC-1", Course: "IGCSE", SubjectName: "Physics" }] }) }));
vi.mock("@/lib/solverCache", () => ({ loadCacheIndex: async () => state.saved, loadCachedPaper: async (id: string) => (state.saved?.papers[id] ? STORED : null) }));

const mod = () => import("./[...path]/route.js");
const req = (url: string, init: RequestInit = {}) => new Request(url, init) as unknown as Parameters<Awaited<ReturnType<typeof mod>>["GET"]>[0];
const ctx = (p: string[]) => ({ params: Promise.resolve({ path: p }) });
const saved = () => ({ papers: { QPID_PHYS_1: { board: "IGCSE", subject: "Physics", title: "Ch1.1 WS1", qpId: "QPID_PHYS_1" } }, library: { IGCSE: { Physics: { "Paper 2": [{ qpId: "QPID_PHYS_1", title: "Ch1.1 WS1", cached: true }] } } } });
const down = () => vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("tunnel gone")));
const live = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status })));

afterEach(() => { vi.unstubAllGlobals(); state.session = { userId: "STU-1", userType: "Student" }; state.url = "https://live.example"; state.saved = null; });

describe("worksheet reply", () => {
  it("is the live reply when the live service answers", async () => {
    state.saved = saved(); live(200, { questions: [{ questionNumber: "9" }] });
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect((await r.json()).questions[0].questionNumber).toBe("9");
    expect(r.headers.get("X-Solver-Source")).toBeNull();
  });
  it("comes from the saved copy when the live service is unreachable", async () => {
    state.saved = saved(); down();
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    const j = await r.json();
    expect(r.status).toBe(200); expect(j.fromCache).toBe(true); expect(j.questions).toHaveLength(1); expect(r.headers.get("X-Solver-Source")).toBe("cache");
  });
  it("comes from the saved copy when the live service answers 502 or something that is not JSON", async () => {
    state.saved = saved(); live(502, "<html>bad gateway</html>");
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect((await r.json()).fromCache).toBe(true);
  });
  it("keeps the old error when there is no saved copy of that paper", async () => {
    state.saved = saved(); down();
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_2" }) }), ctx(["fetch-and-digitize"]));
    expect(r.status).toBe(503);
  });
  it("refuses a student who is not enrolled in that subject, even if a saved copy exists", async () => {
    state.saved = { ...saved(), papers: { QPID_PHYS_1: { board: "IGCSE", subject: "Chemistry", qpId: "QPID_PHYS_1" } } }; down();
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect(r.status).toBe(503);
  });
  it("does not use the saved copy for a clear 4xx answer", async () => {
    state.saved = saved(); live(400, { error: "bad request" });
    const { POST } = await mod();
    const r = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect(r.status).toBe(400); expect((await r.json()).fromCache).toBeUndefined();
  });
  it("is served on request for Management only (the check header)", async () => {
    state.saved = saved(); live(200, { questions: [{ questionNumber: "9" }] });
    const { POST } = await mod();
    const asStudent = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", headers: { "x-solver-source": "cache" }, body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect((await asStudent.json()).questions[0].questionNumber).toBe("9");
    state.session = { userId: "MGT-1", userType: "Management" };
    const asAdmin = await POST(req("https://x/api/mcq/fetch-and-digitize", { method: "POST", headers: { "x-solver-source": "cache" }, body: JSON.stringify({ qpId: "QPID_PHYS_1" }) }), ctx(["fetch-and-digitize"]));
    expect((await asAdmin.json()).fromCache).toBe(true);
  });
});

describe("library", () => {
  it("carries cached: true on saved papers when the live library answers", async () => {
    state.saved = saved(); live(200, LIB);
    const { GET } = await mod();
    const j = await (await GET(req("https://x/api/mcq/library"), ctx(["library"]))).json();
    const list = j.IGCSE.Physics["Paper 2"];
    expect(list.find((p: { qpId: string }) => p.qpId === "QPID_PHYS_1").cached).toBe(true);
    expect(list.find((p: { qpId: string }) => p.qpId === "QPID_PHYS_2").cached).toBeUndefined();
  });
  it("is the saved library, filtered to the student's subjects, when the live one is unreachable", async () => {
    state.saved = saved(); down();
    const { GET } = await mod();
    const r = await GET(req("https://x/api/mcq/library"), ctx(["library"]));
    expect(r.headers.get("X-Solver-Source")).toBe("cache");
    expect((await r.json()).IGCSE.Physics["Paper 2"]).toHaveLength(1);
  });
  it("is empty of other subjects for a student not enrolled in them", async () => {
    state.saved = { ...saved(), library: { IGCSE: { Chemistry: { "Paper 2": [{ qpId: "X", title: "c", cached: true }] } } } }; down();
    const { GET } = await mod();
    expect(await (await GET(req("https://x/api/mcq/library"), ctx(["library"]))).json()).toEqual({});
  });
  it("keeps the old 503 when there is no saved copy at all", async () => {
    state.saved = null; down();
    const { GET } = await mod();
    expect((await GET(req("https://x/api/mcq/library"), ctx(["library"]))).status).toBe(503);
  });
  it("a broken saved index never breaks the live library", async () => {
    state.saved = { papers: 5 as unknown as Record<string, unknown>, library: 7 }; live(200, LIB);
    const { GET } = await mod();
    expect((await GET(req("https://x/api/mcq/library"), ctx(["library"]))).status).toBe(200);
  });
});
