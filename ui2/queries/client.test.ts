import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

const ok = () => new Response(JSON.stringify({ ok: 1 }), { status: 200 });
afterEach(() => vi.restoreAllMocks());

describe("apiFetch network drops", () => {
  it("retries a read once", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(ok());
    await expect(apiFetch("/api/x")).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("never repeats a write by itself, and says what happened", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/x", { method: "POST", body: {} })).rejects.toThrow(/Could not reach the server/);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("retries a write that asked for it, once", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/x", { method: "POST", body: {}, retry: true })).rejects.toBeInstanceOf(ApiError);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
