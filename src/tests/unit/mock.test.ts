import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import { saveMockResult } from "@/lib/actions/mock";

const db = prisma as any;

const SAMPLE_RESULT = {
  subject: "Mathematics",
  level: "A-Level",
  diff: "medium",
  score: 75,
  grade: "B",
  timeTaken: 1800,
};

describe("saveMockResult", () => {
  it("saves the result linked to the logged-in user", async () => {
    db.mockResult.create.mockResolvedValue({ id: "mr-1", ...SAMPLE_RESULT });
    db.syllabusItem.findFirst.mockResolvedValue(null); // no syllabus item — should still succeed

    const result = await saveMockResult(SAMPLE_RESULT);

    expect(db.mockResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: "test-user-id", // from mocked auth()
          subject: "Mathematics",
          score: 75,
          grade: "B",
        }),
      })
    );
    expect(result).toMatchObject({ success: expect.any(Boolean) });
  });

  it("upserts StudentProgress when a matching syllabus item exists", async () => {
    db.mockResult.create.mockResolvedValue({ id: "mr-2" });
    db.syllabusItem.findFirst.mockResolvedValue({ id: "syl-1" });
    db.studentSyllabusProgress.findFirst.mockResolvedValue({ id: "sp-1" });
    db.studentSyllabusProgress.upsert.mockResolvedValue({});

    await saveMockResult(SAMPLE_RESULT);

    expect(db.studentSyllabusProgress.upsert).toHaveBeenCalled();
  });

  it("returns failure when user is not authenticated", async () => {
    // Override auth mock for this test only
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await saveMockResult(SAMPLE_RESULT);

    expect(result).toEqual({ success: false, error: "Not logged in" });
    expect(db.mockResult.create).not.toHaveBeenCalled();
  });
});
