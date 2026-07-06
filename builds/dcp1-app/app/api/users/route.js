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

// Management creates a Parent account, view-only, linked to one or more Students.
// body: { name, studentIds: [] }
export async function POST(req) {
  const { name, studentIds } = await req.json();
  if (!name || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "name and at least one studentId are required." }, { status: 400 });
  }
  const db = readDB();
  const userId = nextId(db, "PAR");
  const user = { UserID: userId, UserType: "Parent", Name: name, Status: "Active", StudentIDs: studentIds };
  const username = makeUsername(name, db);
  const password = randomPassword();
  db.users.push(user);
  db.credentials.push({ UserID: userId, Username: username, Password: password });
  writeDB(db);
  return NextResponse.json({ user, credentials: { username, password } });
}

// Management sets a Student/Staff account's Timezone (used by the schedule image).
// body: { userId, timezone: "India" | "Saudi" }
export async function PATCH(req) {
  const { userId, timezone } = await req.json();
  if (!["India", "Saudi"].includes(timezone)) {
    return NextResponse.json({ error: "timezone must be India or Saudi." }, { status: 400 });
  }
  const db = readDB();
  const user = db.users.find((u) => u.UserID === userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  user.Timezone = timezone;
  writeDB(db);
  return NextResponse.json({ user });
}
