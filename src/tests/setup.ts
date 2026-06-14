import { vi, beforeEach } from "vitest";

// ── Mock Next.js server-only APIs that don't exist in test environment ────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  // unstable_cache: pass-through — just calls the function directly in tests
  unstable_cache: (fn: Function) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
  headers: vi.fn(() => new Map()),
}));

// ── Mock next-auth so actions that call auth() don't crash ────────────────────
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "test-user-id", email: "test@example.com", role: "student" },
  })),
}));

// ── Mock Prisma — replaced per-test with vi.mocked ────────────────────────────
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticketHistory: {
      create: vi.fn(),
    },
    mockResult: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    syllabusItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    studentProgress: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    academicSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    sessionAttendance: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    studentProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    studentSyllabusProgress: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    taskAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    taskSubmission: {
      upsert: vi.fn(),
    },
    syllabusChapter: {
      findMany: vi.fn(),
    },
    doubt: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studentEnrolmentList: {
      findMany: vi.fn(),
    },
    studentEnrolmentItem: {
      findMany: vi.fn(),
    },
    discount: {
      findMany: vi.fn(),
    },
    rateCard: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rateItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rateList: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    portalPermission: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendarItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    paymentRecord: {
      create: vi.fn(),
      update: vi.fn(),
    },
    ledgerEntry: {
      create: vi.fn(),
    },
    bankAccount: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    billingMonth: {
      upsert: vi.fn(),
    },
    notificationType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    studentInvoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    studentInvoiceStatusChangeLog: {
      create: vi.fn(),
    },
    group: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    service: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn(mockPrisma)),
  };
  return { default: mockPrisma };
});

beforeEach(() => {
  vi.clearAllMocks();
});
