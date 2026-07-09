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

// Every pending account type converts to exactly one final type — this is
// the only mapping that decides it. TeacherInterviewAcc and StaffInterviewAcc
// both become Staff, differing only in the StaffRole they start with;
// AmbassadorInterviewAcc becomes Ambassador directly (no StaffRole/Course).
const CONVERT_MAP = {
  TrialAcc: { newType: "Student", prefix: "STU", extra: () => ({ Course: "" }) },
  TeacherInterviewAcc: { newType: "Staff", prefix: "STF", extra: () => ({ StaffRole: "Teacher" }) },
  StaffInterviewAcc: { newType: "Staff", prefix: "STF", extra: () => ({ StaffRole: "Staff" }) },
  AmbassadorInterviewAcc: { newType: "Ambassador", prefix: "AMB", extra: () => ({}) },
};

// body: { accountId } — the pending account UserID to convert (TrialAcc,
// TeacherInterviewAcc, StaffInterviewAcc, or AmbassadorInterviewAcc).
// The old record is kept forever (Status: "Converted") but can still log in —
// the same pending account is reused to request Trials/Interviews for other
// Services later, it isn't a one-time-use account.
// Invoices already billed to the TrialAcc's ID (e.g. the one-month-advance
// Trial invoice) are reassigned to the new Student so billing history carries
// over; everything else about the new account starts fresh.
export async function POST(req) {
  const { accountId } = await req.json();
  const db = readDB();

  const oldUser = db.users.find((u) => u.UserID === accountId);
  if (!oldUser) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const mapping = CONVERT_MAP[oldUser.UserType];
  if (!mapping) {
    return NextResponse.json(
      { error: `Only ${Object.keys(CONVERT_MAP).join("/")} can be converted.` },
      { status: 400 }
    );
  }
  if (oldUser.Status === "Converted") {
    return NextResponse.json({ error: "Already converted." }, { status: 400 });
  }

  const { newType, prefix, extra } = mapping;
  const newUserId = nextId(db, prefix);

  const newUser = {
    UserID: newUserId,
    UserType: newType,
    Name: oldUser.Name,
    Status: "Active",
    ...(["Student", "Staff"].includes(newType) ? { Timezone: "Asia/Kolkata" } : {}),
    ...extra(),
  };
  const username = makeUsername(oldUser.Name, db);
  const password = randomPassword();

  db.users.push(newUser);
  db.credentials.push({ UserID: newUserId, Username: username, Password: password });

  if (newType === "Student") {
    for (const invoice of db.invoices) {
      if (invoice.StudentID === accountId) invoice.StudentID = newUserId;
    }
  }

  oldUser.Status = "Converted";
  oldUser.ConvertedToUserID = newUserId;

  writeDB(db);
  return NextResponse.json({ oldUser, newUser, credentials: { username, password } });
}
