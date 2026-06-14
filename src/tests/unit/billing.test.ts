import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/db";
import {
  getStudentInvoices,
  submitManualPaymentReceipt,
} from "@/lib/actions/billing";

const db = prisma as any;

describe("getStudentInvoices", () => {
  it("throws when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    await expect(getStudentInvoices("student-id")).rejects.toThrow("Unauthorized");
  });

  it("queries student invoices and includes lineItems and billingMonth", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "student-id", email: "student@test.com" } } as any);

    db.studentInvoice.findMany.mockResolvedValue([
      { id: "inv-1", month: "June 2026", netAmount: 100, dueAmount: 100, lineItems: [], billingMonth: {} },
    ]);

    const result = await getStudentInvoices("student-id");

    expect(db.studentInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "student-id" },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].netAmount).toBe(100);
  });
});

describe("submitManualPaymentReceipt", () => {
  it("creates a payment record, marks invoice as processing, and logs history", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "student-id", email: "student@test.com" } } as any);

    db.studentInvoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "unpaid",
    });

    db.paymentRecord.create.mockResolvedValue({
      id: "pay-rec-1",
      status: "PENDING_VERIFICATION",
    });

    const result = await submitManualPaymentReceipt({
      invoiceId: "inv-1",
      receiptUrl: "https://supabase-bucket/receipt.png",
      amount: 150.00,
      currency: "GBP",
      notes: "Settle invoice 1",
    });

    expect(db.paymentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "STUDENT_INVOICE",
          entityId: "inv-1",
          amount: 150.00,
          receiptLink: "https://supabase-bucket/receipt.png",
          status: "PENDING_VERIFICATION",
        }),
      })
    );

    expect(db.studentInvoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "processing" },
    });

    expect(db.studentInvoiceStatusChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: "inv-1",
          fromStatus: "unpaid",
          toStatus: "processing",
        }),
      })
    );

    expect(result.status).toBe("PENDING_VERIFICATION");
  });
});
