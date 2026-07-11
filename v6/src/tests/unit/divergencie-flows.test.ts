import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db";
import { checkAndActivateStudent, updateOnboardingFlags } from "@/lib/actions/onboarding";
import { POST as generateInvoicePOST } from "@/app/api/invoices/generate/route";
import { NextRequest } from "next/server";

const db = prisma as any;

describe("Onboarding Gate Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkAndActivateStudent should activate student only when all 4 flags are true", async () => {
    // 1. Gaps present
    db.studentProfile.findUnique.mockResolvedValueOnce({
      userId: "stud-1",
      gcrAssigned: true,
      groupAssigned: true,
      scheduleAssigned: false, // incomplete
      financeApprovedFlag: true,
      status: "PAUSED",
    });

    let activated = await checkAndActivateStudent("stud-1");
    expect(activated).toBe(false);
    expect(db.studentProfile.update).not.toHaveBeenCalled();

    // 2. All flags true
    db.studentProfile.findUnique.mockResolvedValueOnce({
      userId: "stud-1",
      gcrAssigned: true,
      groupAssigned: true,
      scheduleAssigned: true,
      financeApprovedFlag: true,
      status: "PAUSED",
    });
    db.notificationType.findUnique.mockResolvedValueOnce({ id: "nt-1", name: "ONBOARDING_COMPLETE" });
    db.studentProfile.update.mockResolvedValueOnce({ userId: "stud-1", status: "ACTIVE" });

    activated = await checkAndActivateStudent("stud-1");
    expect(activated).toBe(true);
    expect(db.studentProfile.update).toHaveBeenCalledWith({
      where: { userId: "stud-1" },
      data: { status: "ACTIVE" },
    });
    expect(db.notification.create).toHaveBeenCalled();
  });

  it("updateOnboardingFlags should restrict fields by department and authorize correctly", async () => {
    const { auth } = await import("@/lib/auth");
    // Mock user is PR staff
    vi.mocked(auth).mockResolvedValue({
      user: { id: "pr-1", email: "pr@dc.com", role: "staff", dept: "PR" },
    } as any);

    db.user.findUnique.mockResolvedValueOnce({ id: "stud-1", role: "student" });
    db.studentProfile.upsert.mockResolvedValueOnce({ userId: "stud-1", gcrAssigned: true });
    db.studentProfile.findUnique.mockResolvedValueOnce({
      userId: "stud-1",
      gcrAssigned: true,
      groupAssigned: false,
    });

    const result = await updateOnboardingFlags("stud-1", { gcrAssigned: true });
    expect(result.activated).toBe(false);
    expect(db.studentProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "stud-1" },
        update: expect.objectContaining({ gcrAssigned: true }),
      })
    );
  });
});

describe("Invoice Generation API Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a draft invoice for student sessions with correct rates and discounts", async () => {
    const { auth } = await import("@/lib/auth");
    // Mock authorized finance user
    vi.mocked(auth).mockResolvedValue({
      user: { id: "fin-1", email: "finance@dc.com", role: "staff", dept: "Finance" },
    } as any);

    db.billingMonth.upsert.mockResolvedValueOnce({ id: "month-1", month: "2026-07" });

    // Enrolments lists query mock
    db.studentEnrolmentList.findMany.mockResolvedValueOnce([
      {
        id: "el-1",
        studentId: "stud-1",
        student: { id: "stud-1", name: "Ali", email: "ali@dc.com", country: "UK" },
        items: [
          {
            id: "ei-1",
            serviceId: "srv-1",
            service: { id: "srv-1", subjectName: "Maths", standardRate: 150 },
          },
        ],
      },
    ]);

    // Delete existing drafts mock
    db.studentInvoice.deleteMany.mockResolvedValueOnce({ count: 0 });

    // Group check
    db.group.findMany.mockResolvedValueOnce([]);

    // Sessions matching month: 2 completed sessions
    db.academicSession.findMany.mockResolvedValueOnce([
      {
        id: "sess-1",
        serviceId: "srv-1",
        subject: "Maths",
        startTime: new Date("2026-07-05T10:00:00Z"),
        durationHours: 1.5,
        attendances: [
          {
            studentId: "stud-1",
            status: "PRESENT",
            teacherLoggedHours: 1.5,
            hoursMatchStatus: "MATCHED",
          },
        ],
      },
    ]);

    // Rate card lookup: UK, group code C (defaults to C for individual) -> £200 rate
    db.rateItem.findFirst.mockResolvedValueOnce({ clientRate: 200 });

    // Discounts lookup: 10% percentage discount
    db.discount.findMany.mockResolvedValueOnce([
      { id: "disc-1", value: 10, isPct: true },
    ]);

    // Student invoice create mock
    db.studentInvoice.create.mockResolvedValueOnce({
      id: "inv-1",
      netAmount: 270, // 1.5 hrs * 200 = 300 subtotal. 10% discount = 30 discount. netAmount = 270
    });

    const req = new NextRequest("http://localhost/api/invoices/generate", {
      method: "POST",
      body: JSON.stringify({ month: "2026-07", studentId: "stud-1" }),
    });

    const res = await generateInvoicePOST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.count).toBe(1);
    expect(db.studentInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 300,
          discountApplied: 30,
          netAmount: 270,
        }),
      })
    );
  });
});
