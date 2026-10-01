import test from "node:test";
import assert from "node:assert/strict";
import { parseFormEntry, parseLabelled, parseImport, looksLikeStudentForm, findMatches, findReferrer, buildCreateBody, buildFillPatch, defaultsForLocation } from "./accountImport.js";

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

test("create body carries every field; only a coupon would go to Notes", () => {
  const body = buildCreateBody(parseFormEntry(ENTRY, "2026-10-01"));
  assert.equal(body.userType, "Student");
  assert.equal(body.course, "AS Level");
  assert.equal(body.whatsappNumber, "+919800000001");
  assert.equal(body.parentWhatsappNumber, "+919800000002");
  assert.equal(body.location, "India");
  assert.equal(body.timezone, "Asia/Kolkata");
  assert.equal(body.currency, "INR");
  assert.equal(body.gender, "Female");
  assert.equal(body.helpWanted, "Classes");
  assert.equal(body.subjects, "Chemistry, Physics, BIology");
  assert.equal(body.heardAbout, "Social Media, Referral");
  assert.equal(body.scoreAStar, "Yes");
  assert.equal(body.referrerName, "Ritul");
  assert.equal("referrerUserId" in body, false);
  assert.equal("notes" in body, false);
  const withCoupon = buildCreateBody(parseFormEntry(ENTRY + "\nCoupon Code    SAVE10", "2026-10-01"));
  assert.equal(withCoupon.notes, "Intake form (imported 2026-10-01)\nCoupon: SAVE10");
});

test("a referrer links to an account only when exactly one has that full name", () => {
  const users = [{ UserID: "TCH-7", UserType: "Teacher", Name: "Ritul Rao" }, { UserID: "STU-1", UserType: "Student", Name: "Dup Name" }, { UserID: "STU-2", UserType: "Student", Name: "Dup  name" }];
  assert.equal(findReferrer(users, "Ritul"), null);
  assert.equal(findReferrer(users, "ritul  rao").userId, "TCH-7");
  assert.equal(findReferrer(users, "Dup Name"), null);
  const body = buildCreateBody(parseFormEntry("Student Name    A B\nWho referred you? (Referrer Name)    Ritul Rao"), { referrer: findReferrer(users, "Ritul Rao") });
  assert.equal(body.referrerUserId, "TCH-7");
  assert.equal(body.referrerName, "Ritul Rao");
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

test("a shorter stored name still matches, and so does the parent number", () => {
  const parsed = parseFormEntry(ENTRY);
  const users = [
    { UserID: "STU-5", UserType: "Student", Name: "Asha" },
    { UserID: "STU-6", UserType: "Student", Name: "Asha Kumar" },
    { UserID: "STU-7", UserType: "Student", Name: "Ash" },
    { UserID: "STU-8", UserType: "Student", Name: "Different", ParentWhatsAppNumber: "+91 98000 00002" },
  ];
  const m = findMatches(users, parsed);
  assert.deepEqual(m.map((x) => [x.user.UserID, x.reasons.join("+")]), [["STU-8", "parent number"], ["STU-5", "similar name"]]);
});

test("fill patch only fills blanks and keeps what differs", () => {
  const parsed = parseFormEntry(ENTRY, "2026-10-01");
  const user = { UserID: "STU-9", UserType: "Student", Name: "Asha Verma", Email: "kept@example.com", WhatsAppNumber: "", Course: "IGCSE", Notes: "Old note", Gender: "Female", ReferrerName: "Someone" };
  const r = buildFillPatch(user, parsed);
  assert.equal(r.patch.userId, "STU-9");
  assert.equal(r.patch.whatsappNumber, "+919800000001");
  assert.equal(r.patch.parentWhatsappNumber, "+919800000002");
  assert.equal(r.patch.location, "India");
  assert.equal(r.patch.subjects, "Chemistry, Physics, BIology");
  assert.equal(r.patch.helpWanted, "Classes");
  assert.equal(r.patch.heardAbout, "Social Media, Referral");
  assert.equal(r.patch.scoreAStar, "Yes");
  for (const k of ["email", "course", "gender", "referrerName", "notes"]) assert.equal(k in r.patch, false, k);
  assert.deepEqual(r.kept.map((k) => k.label), ["Email", "Course", "Referrer"]);
  // The same number written with spaces is not a difference.
  const spaced = buildFillPatch({ ...user, WhatsAppNumber: "+91 98000 00001" }, parsed);
  assert.equal(spaced.kept.some((k) => k.label === "WhatsApp number"), false);
  assert.equal("whatsappNumber" in spaced.patch, false);
  // A blank referrer is filled and linked when the account is known.
  const blank = buildFillPatch({ ...user, ReferrerName: "" }, parsed, { referrer: { userId: "TCH-7", name: "Ritul Rao" } });
  assert.equal(blank.patch.referrerName, "Ritul");
  assert.equal(blank.patch.referrerUserId, "TCH-7");
  // Applying the same entry to the updated record changes nothing.
  const filled = { ...user, ...{ WhatsAppNumber: r.patch.whatsappNumber, ParentWhatsAppNumber: r.patch.parentWhatsappNumber, Location: "India", Subjects: r.patch.subjects, HelpWanted: "Classes", HeardAbout: r.patch.heardAbout, ScoreAStar: "Yes" } };
  assert.equal(buildFillPatch(filled, parsed).nothingToDo, true);
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

test("labels with a bracketed note such as (Optional) keep the note out of the value", () => {
  const p = parseFormEntry("Student Name    Angad Bhatt\nParent's Email (Optional)   vipulab@gmail.com\nSchool Name (Optional)   Cp Goenka International, Pune\nParent's Contact Number    +918007671000\nWhatsApp Number (Include country code!) +919970570523");
  assert.equal(p.fields.parentEmail, "vipulab@gmail.com");
  assert.equal(p.fields.school, "Cp Goenka International, Pune");
  assert.equal(p.fields.parentWhatsapp, "+918007671000");
  assert.equal(p.fields.whatsapp, "+919970570523");
  assert.deepEqual(p.warnings, []);
});

test("a student form is recognised even when another account type is selected", () => {
  assert.equal(looksLikeStudentForm(ENTRY), true);
  assert.equal(looksLikeStudentForm("Name: Mr Test\nEmail: t@example.com"), false);
  const p = parseImport(ENTRY, "Parent");
  assert.equal(p.userType, "Student");
  assert.equal(p.ok, true);
  assert.equal(parseImport("Name: P", "Parent").userType, "Parent");
});
