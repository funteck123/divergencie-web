import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { isValidTimezone, normalizeTimezone } from "@/lib/timezones";

export async function GET() {
  const db = readDB();
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

export const DEPARTMENTS = ["Marketing", "Finance", "HR", "IT", "PR"];
// Teacher/Ambassador Department is fixed to their own type name (not user
// editable) — Staff instead picks one of DEPARTMENTS. Role is free text on
// all three: for Staff it's their job title, for Teacher/Ambassador it's
// whatever descriptor Management wants to record (e.g. "Subject Lead").
const ROLE_ELIGIBLE = ["Teacher", "Staff", "Ambassador"];
const FIXED_DEPARTMENT = { Teacher: "Teacher", Ambassador: "Ambassador" };

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

// Management creates any account type directly from the Accounts tab.
// Student/Teacher/Staff created here start fresh (no linked Trial/Interview
// record, no invoice carry-over) — that history only exists via /api/convert.
// body: { userType, name, studentIds?: [] (Parent), role? (Teacher/Staff/
//         Ambassador job title, free text), course?, batch?, department?
//         (Staff only — Teacher/Ambassador get a fixed value), timezone? }
export async function POST(req) {
  const { userType, name, studentIds, role, course, batch, department, timezone } = await req.json();
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

  const db = readDB();
  const userId = nextId(db, ID_PREFIX[userType]);
  const user = { UserID: userId, UserType: userType, Name: name, Status: "Active" };
  if (userType === "Parent") user.StudentIDs = studentIds;
  if (userType === "Staff") {
    user.Timezone = normalizeTimezone(timezone);
  }
  if (userType === "Teacher") {
    user.Timezone = normalizeTimezone(timezone);
  }
  if (userType === "Student") {
    user.Course = course || "";
    user.Timezone = normalizeTimezone(timezone);
  }
  applyBatch(user, userType, batch);
  applyDepartment(user, userType, department);
  applyRole(user, userType, role);

  const username = makeUsername(name, db);
  const password = randomPassword();
  db.users.push(user);
  db.credentials.push({ UserID: userId, Username: username, Password: password });
  writeDB(db);
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
//         role?, batch?, department? (Staff only), studentIds?: [], username?, password? }
export async function PATCH(req) {
  const { userId, name, status, timezone, course, role, batch, department, studentIds, username, password } =
    await req.json();
  if (
    [name, status, timezone, course, role, batch, department, studentIds, username, password].every(
      (v) => v === undefined
    )
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
  if (department && !DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: `department must be one of ${DEPARTMENTS.join(", ")}.` }, { status: 400 });
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

  const db = readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (status !== undefined && user.Status === "Converted") {
    return NextResponse.json({ error: "Converted accounts' status can't be edited here." }, { status: 400 });
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
  if (studentIds !== undefined) user.StudentIDs = studentIds;
  if (batch !== undefined) applyBatch(user, user.UserType, batch);
  if (department !== undefined) applyDepartment(user, user.UserType, department);
  if (username !== undefined) cred.Username = username;
  if (password !== undefined) cred.Password = password;
  writeDB(db);
  return NextResponse.json({ user });
}
