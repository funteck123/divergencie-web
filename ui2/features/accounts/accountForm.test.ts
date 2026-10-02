import { describe, expect, it } from "vitest";
import { buildCreateBody, buildPatchFields, emptyCreateValues, initialValues } from "./accountForm";
import type { UserRecord } from "@/ui2/queries/types";

const student: UserRecord = {
  UserID: "STU-1", UserType: "Student", Name: "Sam", Status: "Active", Username: "sam", Course: "IGCSE", Batch: "B8", Timezone: "Asia/Kolkata", Currency: "INR",
  WhatsAppNumber: "919876543210", Email: "s@x.com", GroupSent: true,
};

describe("edit body (mirrors the classic EditAccountForm)", () => {
  it("sends every Student field and never the password when it is blank", () => {
    const f = buildPatchFields(student, initialValues(student));
    expect(Object.keys(f).sort()).toEqual(
      ["name", "username", "currency", "status", "course", "batch", "whatsappNumber", "parentWhatsappNumber", "parentEmail", "email", "school", "location", "notes", "gender", "helpWanted", "subjects", "heardAbout", "scoreAStar", "referrerName", "referrerUserId", "timesheetUrl", "progressTrackerUrl", "groupSent", "gcrSent", "scheduleSent", "timezone"].sort(),
    );
    expect(f.groupSent).toBe(true);
    expect(f.whatsappNumber).toBe("+919876543210");
  });
  it("includes a password only when one is typed", () => {
    const v = { ...initialValues(student), password: "  newpass " };
    expect(buildPatchFields(student, v).password).toBe("  newpass ");
  });
  it("a Converted account keeps its locked status (no status field)", () => {
    const conv = { ...student, Status: "Converted" };
    expect("status" in buildPatchFields(conv, initialValues(conv))).toBe(false);
    expect(initialValues(conv).status).toBe("Active");
  });
  it("Teacher sends role fields, work folder, timesheet, batch and timezone but no Student fields", () => {
    const t: UserRecord = { UserID: "TCH-1", UserType: "Teacher", Name: "T", Status: "Active", Username: "t" };
    const keys = Object.keys(buildPatchFields(t, initialValues(t)));
    expect(keys).toEqual(expect.arrayContaining(["role", "passportNumber", "whatsappNumber", "email", "workFolderUrl", "timesheetUrl", "batch", "timezone"]));
    expect(keys).not.toContain("course");
    expect(keys).not.toContain("department");
  });
  it("Parent sends linked students and no timezone", () => {
    const p: UserRecord = { UserID: "PAR-1", UserType: "Parent", Name: "P", Status: "Active", Username: "p", StudentIDs: ["STU-1"] };
    const f = buildPatchFields(p, initialValues(p));
    expect(f.studentIds).toEqual(["STU-1"]);
    expect("timezone" in f).toBe(false);
  });
});

describe("create body (mirrors the classic CreateAccount)", () => {
  const v = { ...emptyCreateValues(), name: "New", course: "A Level", batch: "B9" };
  it("Student", () => expect(buildCreateBody("Student", v)).toEqual({ userType: "Student", name: "New", currency: "INR", course: "A Level", batch: "B9", timezone: "Asia/Kolkata" }));
  it("Management has only name and currency", () => expect(buildCreateBody("Management", v)).toEqual({ userType: "Management", name: "New", currency: "INR" }));
  it("Staff sends department and links", () => {
    const b = buildCreateBody("Staff", { ...v, department: "IT" });
    expect(b).toMatchObject({ department: "IT", timezone: "Asia/Kolkata", workFolderUrl: "", timesheetUrl: "", role: "", passportNumber: "", whatsappNumber: "", email: "" });
  });
  it("Pending accounts send no extras", () => expect(buildCreateBody("TrialAcc", v)).toEqual({ userType: "TrialAcc", name: "New", currency: "INR" }));
});
