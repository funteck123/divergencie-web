import test from "node:test";
import assert from "node:assert/strict";
import { parseLeadBody, leadNotes, findDuplicate, phoneKey, ADMISSIONS_SOURCE, LIST_LIMIT } from "./leadForm.js";

const full = (extra = {}) => ({
  name: "Test Student", email: "Student@Example.com", whatsapp: "+44 7700 900123", country: "United Kingdom", source: ADMISSIONS_SOURCE, consent: true,
  parentPhone: "+44 7700 900456", level: "IGCSE / O Levels", heardAbout: "Referral", subjects: ["Physics", "Mathematics"], ...extra,
});

test("the old contact form body still works: only name and email are needed", () => {
  const r = parseLeadBody({ name: "A", email: "a@b.co", notes: "hello" });
  assert.equal(r.lead.source, "Web Contact Form");
  assert.equal(r.lead.message, "hello");
  assert.equal(r.error, undefined);
});

test("missing name or email, or a bad email, is an error", () => {
  assert.match(parseLeadBody({ email: "a@b.co" }).error, /required/);
  assert.match(parseLeadBody({ name: "A", email: "nope" }).error, /valid email/);
});

test("a bot that fills the hidden field is dropped without an error", () => {
  assert.deepEqual(parseLeadBody({ name: "A", email: "a@b.co", website: "http://spam" }), { honeypot: true });
});

test("the full student form needs consent, a WhatsApp number, a parent number, a level and how they heard", () => {
  assert.equal(parseLeadBody(full()).error, undefined);
  assert.match(parseLeadBody(full({ consent: false })).error, /Privacy Policy/);
  assert.match(parseLeadBody(full({ whatsapp: "" })).error, /WhatsApp/);
  assert.match(parseLeadBody(full({ parentPhone: "12" })).error, /parent or guardian/);
  assert.match(parseLeadBody(full({ level: "" })).error, /studying/);
  assert.match(parseLeadBody(full({ heardAbout: "" })).error, /heard/);
  assert.match(parseLeadBody(full({ parentEmail: "x" })).error, /parent email/);
});

test("email is lower-cased and every field is capped, so one post cannot store a huge record", () => {
  const r = parseLeadBody(full({ email: "A@B.CO", name: "x".repeat(5000), subjects: Array.from({ length: 500 }, (_, i) => "s" + i), notes: "y".repeat(9000), coupon: "save10" }));
  assert.equal(r.lead.email, "a@b.co");
  assert.equal(r.lead.name.length, 120);
  assert.equal(r.lead.details.subjects.length, LIST_LIMIT);
  assert.equal(r.lead.message.length, 2000);
  assert.equal(r.lead.details.coupon, "SAVE10");
});

test("non-string and control characters are removed, an unknown A* answer is dropped", () => {
  const r = parseLeadBody(full({ school: { evil: 1 }, gender: "Fe\u0000male", scoreAStar: "maybe" }));
  assert.equal(r.lead.details.school, "");
  assert.equal(r.lead.details.gender, "Female");
  assert.equal(r.lead.details.scoreAStar, "");
});

test("the notes the team reads include every answer", () => {
  const r = parseLeadBody(full({ notes: "Wants A*", school: "City School", parentEmail: "p@x.co", help: ["Classes"], otherSubjects: "Urdu", referrer: "Sana", coupon: "go", scoreAStar: "Yes", utmSource: "ig" }));
  const n = leadNotes(r.lead);
  for (const s of ["Wants A*", "school City School", "+44 7700 900456, p@x.co", "IGCSE / O Levels", "Classes", "Physics, Mathematics, other: Urdu", "Referral via Sana", "GO", "Yes", "ig"]) assert.ok(n.includes(s), s + " missing in:\n" + n);
});

test("a repeat from the same email or WhatsApp number within 30 days is found; an old one or a different person is not", () => {
  const now = Date.parse("2026-10-29T10:00:00Z");
  const leads = [
    { LeadID: "L1", Email: "old@x.co", WhatsAppNumber: "+44 7700 900111", CreatedAt: "2026-08-01T00:00:00Z" },
    { LeadID: "L2", Email: "a@b.co", WhatsAppNumber: "+91 96506 75507", CreatedAt: "2026-10-20T00:00:00Z" },
  ];
  assert.equal(findDuplicate(leads, { email: "a@b.co", whatsapp: "" }, now).LeadID, "L2");
  assert.equal(findDuplicate(leads, { email: "new@x.co", whatsapp: "+919650675507" }, now).LeadID, "L2");
  assert.equal(findDuplicate(leads, { email: "old@x.co", whatsapp: "" }, now), null);
  assert.equal(findDuplicate(leads, { email: "z@x.co", whatsapp: "123" }, now), null);
});

test("the same number written with + or with 00 is the same number; a different number is not", () => {
  assert.equal(phoneKey("+60 12 345 6789"), phoneKey("0060 12 345 6789"));
  assert.equal(phoneKey("+60 12 345 6789"), "60123456789");
  assert.notEqual(phoneKey("+60 12 345 6789"), phoneKey("+60 12 345 6780"));
  const now = Date.parse("2026-10-29T10:00:00Z");
  const leads = [{ LeadID: "L9", Email: "a@b.co", WhatsAppNumber: "+60 12 345 6789", CreatedAt: "2026-10-20T00:00:00Z" }];
  assert.equal(findDuplicate(leads, { email: "other@x.co", whatsapp: "0060123456789" }, now).LeadID, "L9");
});
