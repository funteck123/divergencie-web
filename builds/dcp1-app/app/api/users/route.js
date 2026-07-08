import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

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
  Staff: "STF",
  Student: "STU",
  Parent: "PAR",
  TrialAcc: "TRL",
  InterviewAcc: "INT",
};

// Management creates any account type directly from the Accounts tab.
// Student/Staff created here start fresh (no linked Trial/Interview record,
// no invoice carry-over) — that history only exists via /api/convert.
// body: { userType, name, studentIds?: [] (Parent), staffRole?, course?, timezone? }
export async function POST(req) {
  const { userType, name, studentIds, staffRole, course, timezone } = await req.json();
  if (!userType || !ID_PREFIX[userType]) {
    return NextResponse.json({ error: `userType must be one of ${Object.keys(ID_PREFIX).join(", ")}.` }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (userType === "Parent" && (!Array.isArray(studentIds) || studentIds.length === 0)) {
    return NextResponse.json({ error: "at least one studentId is required for a Parent account." }, { status: 400 });
  }
  if (timezone !== undefined && !["India", "Saudi"].includes(timezone)) {
    return NextResponse.json({ error: "timezone must be India or Saudi." }, { status: 400 });
  }

  const db = readDB();
  const userId = nextId(db, ID_PREFIX[userType]);
  const user = { UserID: userId, UserType: userType, Name: name, Status: "Active" };
  if (userType === "Parent") user.StudentIDs = studentIds;
  if (userType === "Staff") {
    user.StaffRole = staffRole || "Teacher";
    user.Timezone = timezone || "India";
  }
  if (userType === "Student") {
    user.Course = course || "";
    user.Timezone = timezone || "India";
  }

  const username = makeUsername(name, db);
  const password = randomPassword();
  db.users.push(user);
  db.credentials.push({ UserID: userId, Username: username, Password: password });
  writeDB(db);
  return NextResponse.json({ user, credentials: { username, password } });
}

// Management edits an account. Every field is optional — only the ones
// present in the body are changed. UserType/Status aren't editable here:
// Status is state-machine-driven (see /api/convert), not a free-form field.
// body: { userId, name?, timezone?: "India"|"Saudi", course?, staffRole?, studentIds?: [] }
export async function PATCH(req) {
  const { userId, name, timezone, course, staffRole, studentIds } = await req.json();
  if ([name, timezone, course, staffRole, studentIds].every((v) => v === undefined)) {
    return NextResponse.json({ error: "at least one field to update is required." }, { status: 400 });
  }
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "name cannot be blank." }, { status: 400 });
  }
  if (timezone !== undefined && !["India", "Saudi"].includes(timezone)) {
    return NextResponse.json({ error: "timezone must be India or Saudi." }, { status: 400 });
  }
  if (studentIds !== undefined && !Array.isArray(studentIds)) {
    return NextResponse.json({ error: "studentIds must be an array." }, { status: 400 });
  }
  const db = readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (name !== undefined) user.Name = name;
  if (timezone !== undefined) user.Timezone = timezone;
  if (course !== undefined) user.Course = course;
  if (staffRole !== undefined) user.StaffRole = staffRole;
  if (studentIds !== undefined) user.StudentIDs = studentIds;
  writeDB(db);
  return NextResponse.json({ user });
}
