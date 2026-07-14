import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { isValidTimezone, normalizeTimezone } from "@/lib/timezones";
import { requireManagement } from "@/lib/authz";
import { DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT, CURRENCIES } from "@/lib/accountTypes";

// Re-exported for existing importers (e.g. api/paychecks/pdf/route.js) —
// lib/accountTypes.js is the single source of truth now, shared with the
// client-side dashboard, but this route re-exports so nothing else has to
// change its import path.
export { DEPARTMENTS, ROLE_ELIGIBLE, FIXED_DEPARTMENT };

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  // Management needs to see issued credentials persistently (not just at the
  // moment an account is created/converted) — join from db.credentials by UserID.
  const users = db.users.map((u) => {
    const cred = db.credentials.find((c) => c.UserID === u.UserID);
    return cred ? { ...u, Username: cred.Username, Password: cred.Password } : { ...u };
  });
  return NextResponse.json({ users });
}

function makeUsername(name, db) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  let candidate = base;
  let n = 1;
  while (db.credentials.some((c) => c.Username === candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}
function randomPassword() {
  return Math.random().toString(36).slice(-8);
}

const ID_PREFIX = {
  Management: "MGT",
  Teacher: "TCH",
  Staff: "STF",
  Student: "STU",
  Parent: "PAR",
  TrialAcc: "TRL",
  TeacherInterviewAcc: "TIN",
  StaffInterviewAcc: "SIN",
  AmbassadorInterviewAcc: "AIN",
  Ambassador: "AMB",
};

// Batch is the cohort attribute for Student and Teacher accounts (which
// cohort/intake they belong to) — independent of Department now that
// Teacher/Ambassador also carry a Department value.
function applyBatch(user, userType, batch) {
  if (userType === "Student" || userType === "Teacher") {
    user.Batch = batch || "";
  } else {
    delete user.Batch;
  }
}

function applyDepartment(user, userType, department) {
  if (FIXED_DEPARTMENT[userType]) {
    user.Department = FIXED_DEPARTMENT[userType];
  } else if (userType === "Staff") {
    user.Department = department || "";
  } else {
    delete user.Department;
  }
}

function applyRole(user, userType, role) {
  if (ROLE_ELIGIBLE.includes(userType)) {
    user.Role = role || "";
  } else {
    delete user.Role;
  }
}

// Passport/IC number — shown on the Teacher/Staff/Ambassador payslip PDF,
// same eligibility as Role.
function applyPassportNumber(user, userType, passportNumber) {
  if (ROLE_ELIGIBLE.includes(userType)) {
    user.PassportNumber = passportNumber || "";
  } else {
    delete user.PassportNumber;
  }
}

// Teacher/Staff/Ambassador's own WhatsApp contact number — same
// ROLE_ELIGIBLE eligibility as Role/PassportNumber, reusing the same
// WhatsAppNumber field Student already has (applyStudentExtras below) since
// the two UserType buckets never overlap — keeps display code (e.g. MyInfo)
// simple. Student is explicitly left untouched here: applyStudentExtras is
// the sole owner of Student's own WhatsAppNumber, called separately.
function applyWhatsAppNumber(user, userType, whatsappNumber) {
  if (ROLE_ELIGIBLE.includes(userType)) {
    user.WhatsAppNumber = whatsappNumber || "";
  } else if (userType !== "Student") {
    delete user.WhatsAppNumber;
  }
}

// Every account type carries a Currency — Services have their own Currency
// too (the rate's denomination), but the invoice/paycheck's final total is
// always shown in the billed user's Currency, not the Service's.
function applyCurrency(user, currency) {
  user.Currency = currency || "INR";
}

// Student-only contact/admin fields. TimesheetURL/ProgressTrackerURL are
// links Management sets manually per student (no generation logic here —
// just stored strings). GroupSent/GCRSent/ScheduleSent are a private
// onboarding checklist for Management (has the student's Group/Google
// Classroom Room/Schedule actually been communicated to them yet) — not
// derived from anything, just flags Management toggles by hand.
function applyStudentExtras(user, userType, fields) {
  if (userType !== "Student") {
    for (const key of [
      "ParentWhatsAppNumber",
      "Email",
      "School",
      "Location",
      "Notes",
      "TimesheetURL",
      "ProgressTrackerURL",
      "GroupSent",
      "GCRSent",
      "ScheduleSent",
    ]) {
      delete user[key];
    }
    return;
  }
  const {
    whatsappNumber,
    parentWhatsappNumber,
    email,
    school,
    location,
    notes,
    timesheetUrl,
    progressTrackerUrl,
    groupSent,
    gcrSent,
    scheduleSent,
  } = fields;
  if (whatsappNumber !== undefined) user.WhatsAppNumber = whatsappNumber || "";
  if (parentWhatsappNumber !== undefined) user.ParentWhatsAppNumber = parentWhatsappNumber || "";
  if (email !== undefined) user.Email = email || "";
  if (school !== undefined) user.School = school || "";
  if (location !== undefined) user.Location = location || "";
  if (notes !== undefined) user.Notes = notes || "";
  if (timesheetUrl !== undefined) user.TimesheetURL = timesheetUrl || "";
  if (progressTrackerUrl !== undefined) user.ProgressTrackerURL = progressTrackerUrl || "";
  if (groupSent !== undefined) user.GroupSent = Boolean(groupSent);
  if (gcrSent !== undefined) user.GCRSent = Boolean(gcrSent);
  if (scheduleSent !== undefined) user.ScheduleSent = Boolean(scheduleSent);
}

// Management creates any account type directly from the Accounts tab.
// Student/Teacher/Staff created here start fresh (no linked Trial/Interview
// record, no invoice carry-over) — that history only exists via /api/convert.
// body: { userType, name, studentIds?: [] (Parent), role? (Teacher/Staff/
//         Ambassador job title, free text), passportNumber? (Teacher/Staff/
//         Ambassador), whatsappNumber? (Teacher/Staff/Ambassador — Student's
//         own WhatsApp number is a separate field, set via the Student-only
//         extras below), course?, batch?, department? (Staff only — Teacher/
//         Ambassador get a fixed value), timezone?, currency? (every type,
//         defaults to "INR") }
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const body = await req.json();
  const { userType, name, studentIds, role, passportNumber, course, batch, department, timezone, currency, whatsappNumber } = body;
  if (!userType || !ID_PREFIX[userType]) {
    return NextResponse.json({ error: `userType must be one of ${Object.keys(ID_PREFIX).join(", ")}.` }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (userType === "Parent" && (!Array.isArray(studentIds) || studentIds.length === 0)) {
    return NextResponse.json({ error: "at least one studentId is required for a Parent account." }, { status: 400 });
  }
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: "timezone is not a recognized IANA timezone." }, { status: 400 });
  }
  if (userType === "Staff" && department && !DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: `department must be one of ${DEPARTMENTS.join(", ")}.` }, { status: 400 });
  }
  if (currency !== undefined && !CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: `currency must be one of ${CURRENCIES.join(", ")}.` }, { status: 400 });
  }

  const db = await readDB();
  const userId = nextId(db, ID_PREFIX[userType]);
  const user = { UserID: userId, UserType: userType, Name: name, Status: "Active" };
  if (userType === "Parent") user.StudentIDs = studentIds;
  if (["Staff", "Teacher", "Ambassador"].includes(userType)) {
    user.Timezone = normalizeTimezone(timezone);
  }
  if (userType === "Student") {
    user.Course = course || "";
    user.Timezone = normalizeTimezone(timezone);
  }
  applyBatch(user, userType, batch);
  applyDepartment(user, userType, department);
  applyRole(user, userType, role);
  applyPassportNumber(user, userType, passportNumber);
  applyWhatsAppNumber(user, userType, whatsappNumber);
  applyCurrency(user, currency);
  applyStudentExtras(user, userType, body);

  const username = makeUsername(name, db);
  const password = randomPassword();
  db.users.push(user);
  db.credentials.push({ UserID: userId, Username: username, Password: password });
  await writeDB(db);
  return NextResponse.json({ user, credentials: { username, password } });
}

// Management edits an account. Every field is optional — only the ones
// present in the body are changed. UserType isn't editable here: conversion
// between types only happens through /api/convert, which handles ID
// reassignment and invoice carry-over that a raw type swap would skip.
// Status here is limited to Active/Inactive — "Converted" is a terminal
// state stamped by /api/convert alongside ConvertedToUserID, and can't be
// set or cleared from this endpoint.
// body: { userId, name?, status?: "Active"|"Inactive", timezone?, course?,
//         role?, passportNumber?, whatsappNumber? (Teacher/Staff/Ambassador
//         — same field name doubles as Student's own WhatsApp number below,
//         routed by UserType), batch?, department? (Staff only),
//         currency?, studentIds?: [], username?, password? }
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const patchBody = await req.json();
  const {
    userId,
    name,
    status,
    timezone,
    course,
    role,
    passportNumber,
    batch,
    department,
    currency,
    studentIds,
    username,
    password,
    whatsappNumber,
    parentWhatsappNumber,
    email,
    school,
    location,
    notes,
    timesheetUrl,
    progressTrackerUrl,
    groupSent,
    gcrSent,
    scheduleSent,
  } = patchBody;
  if (
    [
      name,
      status,
      timezone,
      course,
      role,
      passportNumber,
      batch,
      department,
      currency,
      studentIds,
      username,
      password,
      whatsappNumber,
      parentWhatsappNumber,
      email,
      school,
      location,
      notes,
      timesheetUrl,
      progressTrackerUrl,
      groupSent,
      gcrSent,
      scheduleSent,
    ].every((v) => v === undefined)
  ) {
    return NextResponse.json({ error: "at least one field to update is required." }, { status: 400 });
  }
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "name cannot be blank." }, { status: 400 });
  }
  if (status !== undefined && !["Active", "Inactive"].includes(status)) {
    return NextResponse.json({ error: "status must be Active or Inactive." }, { status: 400 });
  }
  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: "timezone is not a recognized IANA timezone." }, { status: 400 });
  }
  if (studentIds !== undefined && !Array.isArray(studentIds)) {
    return NextResponse.json({ error: "studentIds must be an array." }, { status: 400 });
  }
  if (username !== undefined && !username.trim()) {
    return NextResponse.json({ error: "username cannot be blank." }, { status: 400 });
  }
  if (password !== undefined && !password.trim()) {
    return NextResponse.json({ error: "password cannot be blank." }, { status: 400 });
  }

  const db = await readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (status !== undefined && user.Status === "Converted") {
    return NextResponse.json({ error: "Converted accounts' status can't be edited here." }, { status: 400 });
  }
  if (user.UserType === "Staff" && department && !DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: `department must be one of ${DEPARTMENTS.join(", ")}.` }, { status: 400 });
  }
  if (currency !== undefined && !CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: `currency must be one of ${CURRENCIES.join(", ")}.` }, { status: 400 });
  }

  let cred;
  if (username !== undefined || password !== undefined) {
    cred = db.credentials.find((c) => c.UserID === userId);
    if (!cred) return NextResponse.json({ error: "No credentials found for this account." }, { status: 404 });
    if (username !== undefined && db.credentials.some((c) => c.Username === username && c.UserID !== userId)) {
      return NextResponse.json({ error: "username already taken." }, { status: 400 });
    }
  }

  if (name !== undefined) user.Name = name;
  if (status !== undefined) user.Status = status;
  if (timezone !== undefined) user.Timezone = timezone;
  if (course !== undefined) user.Course = course;
  if (role !== undefined) applyRole(user, user.UserType, role);
  if (passportNumber !== undefined) applyPassportNumber(user, user.UserType, passportNumber);
  if (whatsappNumber !== undefined) applyWhatsAppNumber(user, user.UserType, whatsappNumber);
  if (studentIds !== undefined) user.StudentIDs = studentIds;
  if (batch !== undefined) applyBatch(user, user.UserType, batch);
  if (department !== undefined) applyDepartment(user, user.UserType, department);
  if (currency !== undefined) applyCurrency(user, currency);
  applyStudentExtras(user, user.UserType, patchBody);
  if (username !== undefined) cred.Username = username;
  if (password !== undefined) cred.Password = password;
  await writeDB(db);
  return NextResponse.json({ user });
}
