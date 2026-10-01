import test from "node:test";
import assert from "node:assert/strict";
import { parseFormEntry, parseLabelled, parseImport, findMatches, buildCreateBody, buildFillPatch, defaultsForLocation } from "./accountImport.js";

// Fictional entry in the exact Cognito Forms layout (tabs shown as runs of spaces).
const ENTRY = `DivergenCIECoaching
DivergenCIE Coaching

 View full entry at CognitoForms.com. 

Entry Details
Student Name    Asha Verma
Gender    Female
Location    India
WhatsApp Number (Include country code!)    +919800000001
Your Email    Asha.Verma@Example.com
Parent's Contact Number    +919800000002
What are you studying?    AS Level
How shall we help?    Classes
Subjects    Chemistry
Physics
BIology
Who referred you? (Referrer Name)    Ritul
How did you hear about us?    Social Media
Referral
Do you feel you can score A* with proper guidance?    Yes`;

test("reads every field of a Cognito entry, including multi-line answers", () => {
  const p = parseFormEntry(ENTRY, "2026-10-01");
  assert.equal(p.ok, true);
  assert.deepEqual(
    { ...p.fields },
    {
      name: "Asha Verma",
      gender: "Female",
      location: "India",
      whatsapp: "+919800000001",
      email: "asha.verma@example.com",
      parentWhatsapp: "+919800000002",
      parentEmail: "",
      course: "AS Level",
      help: "Classes",
      subjects: "Chemistry, Physics, BIology",
      referrer: "Ritul",
      heardAbout: "Social Media, Referral",
      scoreAStar: "Yes",
      school: "",
      coupon: "",
    }
  );
  assert.equal(p.timezone, "Asia/Kolkata");
  assert.equal(p.currency, "INR");
  assert.deepEqual(p.warnings, []);
});

test("also reads tab separated, colon separated and single space layouts", () => {
  assert.equal(parseFormEntry("Student Name\tA B\nWhatsApp Number\t+9665\nLocation\tSaudi Arabia").fields.name, "A B");
  assert.equal(parseFormEntry("Student Name: A B\nGender: male").fields.gender, "Male");
  assert.equal(parseFormEntry("Student Name A B\nGender Male").fields.name, "A B");
  const sa = parseFormEntry("Student Name\tA B\nLocation\tSaudi Arabia");
  assert.equal(sa.timezone, "Asia/Riyadh");
  assert.equal(sa.currency, "SAR");
});

test("warns on a missing name, a bad email and a short number", () => {
  const p = parseFormEntry("Gender    Male\nYour Email    nope\nWhatsApp Number    123");
  assert.equal(p.ok, false);
  assert.equal(p.warnings.length, 3);
});

test("create body carries every field and the intake answers in Notes", () => {
  const body = buildCreateBody(parseFormEntry(ENTRY, "2026-10-01"));
  assert.equal(body.userType, "Student");
  assert.equal(body.course, "AS Level");
  assert.equal(body.whatsappNumber, "+919800000001");
  assert.equal(body.parentWhatsappNumber, "+919800000002");
  assert.equal(body.location, "India");
  assert.equal(body.timezone, "Asia/Kolkata");
  assert.equal(body.currency, "INR");
  assert.match(body.notes, /^Intake form \(imported 2026-10-01\)\nGender: Female\nHelp wanted: Classes\nSubjects: Chemistry, Physics, BIology/);
  assert.match(body.notes, /Can score A\* with guidance: Yes$/);
});

test("matches an existing student by WhatsApp number, email or name", () => {
  const users = [
    { UserID: "STU-1", UserType: "Student", Name: "Someone Else", WhatsAppNumber: "+91 98000 00001" },
    { UserID: "STU-2", UserType: "Student", Name: "asha  verma" },
    { UserID: "STU-3", UserType: "Student", Name: "Other", Email: "ASHA.VERMA@example.com" },
    { UserID: "TCH-1", UserType: "Teacher", Name: "Asha Verma" },
    { UserID: "STU-4", UserType: "Student", Name: "No Match" },
  ];
  const m = findMatches(users, parseFormEntry(ENTRY));
  assert.deepEqual(m.map((x) => [x.user.UserID, x.reasons.join("+")]), [["STU-1", "WhatsApp number"], ["STU-3", "email"], ["STU-2", "name"]]);
});

test("fill patch only fills blanks, keeps what differs, appends notes once", () => {
  const parsed = parseFormEntry(ENTRY, "2026-10-01");
  const user = { UserID: "STU-9", UserType: "Student", Name: "Asha Verma", Email: "kept@example.com", WhatsAppNumber: "", Course: "IGCSE", Notes: "Old note" };
  const r = buildFillPatch(user, parsed);
  assert.equal(r.patch.userId, "STU-9");
  assert.equal(r.patch.whatsappNumber, "+919800000001");
  assert.equal(r.patch.parentWhatsappNumber, "+919800000002");
  assert.equal(r.patch.location, "India");
  assert.equal("email" in r.patch, false);
  assert.equal("course" in r.patch, false);
  assert.deepEqual(r.kept.map((k) => k.label), ["Email", "Course"]);
  // The same number written with spaces is not a difference.
  const spaced = buildFillPatch({ ...user, WhatsAppNumber: "+91 98000 00001" }, parsed);
  assert.equal(spaced.kept.some((k) => k.label === "WhatsApp number"), false);
  assert.equal("whatsappNumber" in spaced.patch, false);
  assert.match(r.patch.notes, /^Old note\n\nIntake form \(imported 2026-10-01\)\nGender: Female/);
  // Applying the same entry to the updated record changes nothing.
  const again = buildFillPatch({ ...user, WhatsAppNumber: r.patch.whatsappNumber, ParentWhatsAppNumber: r.patch.parentWhatsappNumber, Location: "India", Notes: r.patch.notes }, parsed);
  assert.equal(again.nothingToDo, true);
});

test("other account types use simple Label: value lines", () => {
  const p = parseImport("Name: Mr Test Teacher\nEmail: T@Example.com\nWhatsApp: +441234567890\nRole: Physics\nBatch: B8\nTimezone: Europe/London", "Teacher");
  assert.equal(p.ok, true);
  const body = buildCreateBody(p);
  assert.deepEqual(body, { userType: "Teacher", name: "Mr Test Teacher", timezone: "Europe/London", role: "Physics", whatsappNumber: "+441234567890", email: "t@example.com", batch: "B8" });
  assert.equal(parseImport("Name: P", "Parent").ok, false);
});

test("location defaults", () => {
  assert.deepEqual(defaultsForLocation("United Kingdom"), { timezone: "Europe/London", currency: "GBP" });
  assert.deepEqual(defaultsForLocation("Mars"), { timezone: "", currency: "" });
});
