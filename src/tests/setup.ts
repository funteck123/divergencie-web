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
    },
    $transaction: vi.fn(async (fn: any) => fn(mockPrisma)),
  };
  return { default: mockPrisma };
});

beforeEach(() => {
  vi.clearAllMocks();
});
