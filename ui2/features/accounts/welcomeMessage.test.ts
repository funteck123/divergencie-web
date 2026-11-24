import { describe, expect, it } from "vitest";
import { WELCOME_WITTY_LINE, buildWelcomeMessage, firstLookStep } from "./welcomeMessage";

// TKT-0435: the welcome message for a new account.
const user = { UserID: "STU-0101", Name: "Priya Nair", UserType: "Student", Timezone: "Asia/Kolkata" };
const creds = { username: "priya.nair", password: "Fake-Pass-123" };
const at = (iso: string) => new Date(iso);

describe("welcome message", () => {
  const m = buildWelcomeMessage(user, creds, "https://www.divergencie.co.uk", at("2026-11-22T05:00:00Z")); // 10:30 in Kolkata
  it("has the link, the username and the password exactly once each, and the person's name", () => {
    expect(m).toContain("Portal link: https://www.divergencie.co.uk/login");
    expect(m.match(/priya\.nair/g)).toHaveLength(1);
    expect(m.match(/Fake-Pass-123/g)).toHaveLength(1);
    expect(m).toContain("Name: Priya Nair");
    expect(m).toContain("Account type: Student");
  });
  it("greets for the person's own time zone", () => {
    expect(m.split("\n")[0]).toBe("Good morning! Welcome to DivergenCIE. 😊");
    expect(buildWelcomeMessage(user, creds, "https://x", at("2026-11-22T16:00:00Z")).split("\n")[0]).toMatch(/^Good evening/);
  });
  it("has three first steps and one witty line, signed by the team", () => {
    expect(m).toMatch(/1\. Open the portal link/);
    expect(m).toMatch(/2\. Check your Schedule/);
    expect(m).toMatch(/3\. Press Report an Issue/);
    expect(m).toContain(WELCOME_WITTY_LINE);
    expect(m.trim().endsWith("The DivergenCIE Team")).toBe(true);
  });
  it("uses no em dash and no brackets, as the owner's writing rule asks", () => {
    expect(m).not.toContain("—");
    expect(m).not.toMatch(/[()[\]]/);
  });
  it("the second step fits the kind of account, and only names things the portal has", () => {
    expect(firstLookStep("Student")).toMatch(/Schedule/);
    expect(firstLookStep("Parent")).toMatch(/child/);
    expect(firstLookStep("Teacher")).toMatch(/Guides/);
    expect(firstLookStep("Staff")).toMatch(/Guides/);
    expect(firstLookStep("Ambassador")).toMatch(/look around/i);
  });
  it("copes with a missing name and a missing time zone", () => {
    const x = buildWelcomeMessage({ UserID: "STU-9", Name: "", UserType: "Student", Timezone: undefined }, creds, "https://x", at("2026-11-22T05:00:00Z"));
    expect(x).toContain("Name: STU-9");
    expect(x.split("\n")[0]).toMatch(/^Good (morning|afternoon|evening)!/);
  });
  it("without a password it says to use the one they already have, and never prints a password line with a value", () => {
    const x = buildWelcomeMessage({ UserID: "STU-9", Name: "Ana", UserType: "Student", Timezone: "Asia/Kolkata" }, { username: "ana" }, "https://x", at("2026-11-22T05:00:00Z"));
    expect(x).toContain("Username: ana");
    expect(x).toMatch(/Password: the one we gave you before/);
    expect(x).not.toMatch(/undefined/);
  });
});
