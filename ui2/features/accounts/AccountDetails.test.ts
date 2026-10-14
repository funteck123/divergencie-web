import { describe, expect, it } from "vitest";
import { detailRows, displayValue, labelOf } from "./AccountDetails";

describe("detailRows", () => {
  const student = { UserID: "STU-0040", UserType: "Student", Name: "Ibraheem", Status: "Active", School: "Al Noor", Password: "hash", PasswordHash: "x", Zeta: "z", Alpha: ["a", "b"], GCRSent: true } as never;
  it("never shows secrets", () => {
    const keys = detailRows(student).map((r) => r.key);
    expect(keys).not.toContain("Password");
    expect(keys).not.toContain("PasswordHash");
  });
  it("shows the school and every other field, common ones first", () => {
    const rows = detailRows(student);
    expect(rows.find((r) => r.key === "School")?.value).toBe("Al Noor");
    expect(rows.map((r) => r.key).slice(0, 4)).toEqual(["UserID", "UserType", "Name", "Status"]);
    expect(rows.map((r) => r.key).slice(-3)).toEqual(["Alpha", "GCRSent", "Zeta"]);
  });
  it("lists the usual student fields as dashes when empty", () => {
    const rows = detailRows({ UserID: "STU-1", UserType: "Student", Name: "A", Status: "Active" } as never);
    expect(rows.find((r) => r.key === "Email")?.value).toBe("—");
    expect(rows.find((r) => r.key === "School")?.value).toBe("—");
  });
  it("formats values and labels", () => {
    expect(displayValue(true)).toBe("Yes");
    expect(displayValue([])).toBe("—");
    expect(displayValue(["STU-1", "STU-2"])).toBe("STU-1, STU-2");
    expect(labelOf("WhatsAppNumber")).toBe("WhatsApp");
    expect(labelOf("someFieldName")).toBe("Some Field Name");
  });
});
