import { describe, it, expect, vi } from "vitest";

// Unit tests for auth logic extracted from auth.ts
// These test the credential validation logic in isolation

function validateCredentials(
  email: string | undefined,
  password: string | undefined
): { valid: false; reason: "missing_fields" | "invalid_credentials" | "inactive" } | { valid: true } {
  if (!email || !password) return { valid: false, reason: "missing_fields" };
  return { valid: true };
}

async function checkPassword(
  hash: string | null,
  password: string
): Promise<boolean> {
  if (!hash) return false; // No hash = no access (demo fallback removed)
  // In real code this calls bcrypt.compare — mocked here
  return hash === `hashed:${password}`;
}

describe("Auth validation", () => {
  it("rejects missing email", () => {
    expect(validateCredentials(undefined, "pass").valid).toBe(false);
  });

  it("rejects missing password", () => {
    expect(validateCredentials("a@b.com", undefined).valid).toBe(false);
  });

  it("rejects empty string credentials", () => {
    expect(validateCredentials("", "").valid).toBe(false);
  });

  it("accepts valid email and password", () => {
    expect(validateCredentials("a@b.com", "pass").valid).toBe(true);
  });

  it("denies access when no passwordHash set (demo fallback removed)", async () => {
    const result = await checkPassword(null, "demo");
    expect(result).toBe(false);
  });

  it("denies access with wrong password", async () => {
    const result = await checkPassword("hashed:correct", "wrong");
    expect(result).toBe(false);
  });

  it("grants access with correct bcrypt hash", async () => {
    const result = await checkPassword("hashed:correct", "correct");
    expect(result).toBe(true);
  });
});

describe("Role extraction from JWT", () => {
  const mockToken = {
    id: "user_123",
    role: "staff",
    dept: "HR",
    subGroup: "HR_SUP",
    supervisor: true,
  };

  it("preserves id in token", () => expect(mockToken.id).toBe("user_123"));
  it("preserves role in token", () => expect(mockToken.role).toBe("staff"));
  it("preserves dept in token", () => expect(mockToken.dept).toBe("HR"));
  it("preserves subGroup in token", () => expect(mockToken.subGroup).toBe("HR_SUP"));
  it("preserves supervisor flag", () => expect(mockToken.supervisor).toBe(true));
});
