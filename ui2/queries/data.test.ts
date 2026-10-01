import { describe, it, expect, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./client";
import { applyOptimistic } from "./optimistic";
import { makeQueryClient } from "./queryClient";
import { installFakeApi, type FakeApi } from "../testing/fakeApi";

let fake: FakeApi | undefined;
afterEach(() => {
  fake?.restore();
  fake = undefined;
  vi.unstubAllGlobals();
});

describe("apiFetch (mirrors the classic api())", () => {
  it("sends JSON with the JSON content type and returns the parsed body", async () => {
    fake = installFakeApi({ "PATCH /api/users": { user: { UserID: "STU-1" } } });
    const out = await apiFetch<{ user: { UserID: string } }>("/api/users", { method: "PATCH", body: { userId: "STU-1", email: "a@b.co" } });
    expect(out.user.UserID).toBe("STU-1");
    expect(fake.requests[0]).toMatchObject({ method: "PATCH", url: "/api/users", body: { userId: "STU-1", email: "a@b.co" }, headers: { "Content-Type": "application/json" } });
  });

  it("throws the server's error text as an ApiError with the status", async () => {
    fake = installFakeApi({ "POST /api/users": { status: 400, json: { error: "name is required." } } });
    await expect(apiFetch("/api/users", { method: "POST", body: {} })).rejects.toMatchObject({ name: "ApiError", message: "name is required.", status: 400 });
  });

  it("falls back to a generic message when the server sends none", async () => {
    fake = installFakeApi({ "GET /api/x": { status: 500, json: {} } });
    await expect(apiFetch("/api/x")).rejects.toThrow("Request to /api/x failed");
  });

  it("does not set a JSON content type for FormData (fetch adds the boundary)", async () => {
    fake = installFakeApi({ "POST /api/up": {} });
    await apiFetch("/api/up", { method: "POST", body: new FormData() });
    expect(fake.requests[0]?.headers["Content-Type"]).toBeUndefined();
  });

  it("on 401 forgets the stored user, goes to /login and never resolves (except for /api/login)", async () => {
    const store = new Map([["dcp1_user", "{}"]]);
    const location = { href: "/dashboard/x" };
    vi.stubGlobal("window", { localStorage: { removeItem: (k: string) => store.delete(k) }, location });
    fake = installFakeApi({ "GET /api/me": { status: 401, json: {} }, "POST /api/login": { status: 401, json: { error: "Invalid username or password." } } });
    let settled = false;
    void apiFetch("/api/me").then(() => (settled = true), () => (settled = true));
    await new Promise((r) => setTimeout(r, 20));
    expect(location.href).toBe("/login");
    expect(store.has("dcp1_user")).toBe(false);
    expect(settled).toBe(false);
    await expect(apiFetch("/api/login", { method: "POST", body: {} })).rejects.toThrow("Invalid username or password.");
  });
});

describe("applyOptimistic", () => {
  it("changes the cache at once and rolls back on request", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["users"], [{ id: 1, active: true }]);
    const rollback = await applyOptimistic<{ id: number; active: boolean }[]>(qc, ["users"], (rows) => rows.map((r) => ({ ...r, active: false })));
    expect(qc.getQueryData(["users"])).toEqual([{ id: 1, active: false }]);
    rollback();
    expect(qc.getQueryData(["users"])).toEqual([{ id: 1, active: true }]);
  });

  it("is a no-op when nothing is cached yet", async () => {
    const qc = new QueryClient();
    const rollback = await applyOptimistic<number[]>(qc, ["empty"], (n) => [...n, 1]);
    expect(qc.getQueryData(["empty"])).toBeUndefined();
    rollback();
    expect(qc.getQueryData(["empty"])).toBeUndefined();
  });
});

describe("query defaults", () => {
  it("keeps data fresh for 30 s and never retries a 4xx", () => {
    const qc = makeQueryClient();
    const q = qc.getDefaultOptions().queries!;
    expect(q.staleTime).toBe(30_000);
    const retry = q.retry as (n: number, e: unknown) => boolean;
    expect(retry(0, new ApiError("no", 403, "/x"))).toBe(false);
    expect(retry(0, new ApiError("boom", 500, "/x"))).toBe(true);
    expect(retry(2, new ApiError("boom", 500, "/x"))).toBe(false);
  });
});

describe("fake API", () => {
  it("records requests and answers 404 for unknown routes", async () => {
    fake = installFakeApi({});
    await expect(apiFetch("/api/nope")).rejects.toMatchObject({ status: 404 });
    expect(fake.requests).toHaveLength(1);
  });
});
