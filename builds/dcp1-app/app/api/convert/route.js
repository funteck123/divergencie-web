import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

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

// body: { accountId } — the TrialAcc or InterviewAcc UserID to convert.
// The old record is kept forever (Status: "Converted", can no longer log in).
// The new Student/Staff account starts completely fresh — nothing carries over.
export async function POST(req) {
  const { accountId } = await req.json();
  const db = readDB();

  const oldUser = db.users.find((u) => u.UserID === accountId);
  if (!oldUser) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (!["TrialAcc", "InterviewAcc"].includes(oldUser.UserType)) {
    return NextResponse.json({ error: "Only TrialAcc/InterviewAcc can be converted." }, { status: 400 });
  }
  if (oldUser.Status === "Converted") {
    return NextResponse.json({ error: "Already converted." }, { status: 400 });
  }

  const newType = oldUser.UserType === "TrialAcc" ? "Student" : "Staff";
  const newUserId = nextId(db, newType === "Student" ? "STU" : "STF");

  const newUser = {
    UserID: newUserId,
    UserType: newType,
    Name: oldUser.Name,
    Status: "Active",
    ...(newType === "Staff" ? { StaffRole: "Teacher" } : {}),
  };
  const username = makeUsername(oldUser.Name, db);
  const password = randomPassword();

  db.users.push(newUser);
  db.credentials.push({ UserID: newUserId, Username: username, Password: password });

  oldUser.Status = "Converted";
  oldUser.ConvertedToUserID = newUserId;

  writeDB(db);
  return NextResponse.json({ oldUser, newUser, credentials: { username, password } });
}
