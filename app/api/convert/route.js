import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { generatePassword, hashPassword } from "@/lib/passwords";
import { createTimesheet } from "@/lib/timesheetAutomator";
import { createProgressTracker } from "@/lib/progressTrackerAutomator";

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

// Every pending account type converts to exactly one final type — this is
// the only mapping that decides it. Teacher and Staff are separate
// UserTypes (not one "Staff" type with a role flag), so TeacherInterviewAcc
// and StaffInterviewAcc land on different final types, each with its own ID
// prefix. AmbassadorInterviewAcc becomes Ambassador directly.
// Department is fixed for Teacher/Ambassador (their own type name) and Role/
// PassportNumber start blank on all three for Management to fill in via
// Edit — mirrors FIXED_DEPARTMENT/ROLE_ELIGIBLE in api/users/route.js
// (duplicated since that's a POST/PATCH-only concern, not worth sharing a
// module for two object literals). Every field applyDepartment/applyRole/
// applyPassportNumber would set on a directly-created account of the same
// UserType is set here too, so converted and directly-created accounts have
// the same shape (no missing keys).
const CONVERT_MAP = {
  TrialAcc: { newType: "Student", prefix: "STU", extra: () => ({ Course: "" }) },
  TeacherInterviewAcc: {
    newType: "Teacher",
    prefix: "TCH",
    extra: () => ({ Department: "Teacher", Role: "", PassportNumber: "" }),
  },
  StaffInterviewAcc: {
    newType: "Staff",
    prefix: "STF",
    extra: () => ({ Department: "", Role: "", PassportNumber: "" }),
  },
  AmbassadorInterviewAcc: {
    newType: "Ambassador",
    prefix: "AMB",
    extra: () => ({ Department: "Ambassador", Role: "", PassportNumber: "" }),
  },
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
  const { error } = requireManagement(req);
  if (error) return error;

  const { accountId } = await req.json();
  const db = await readDB();

  const oldUser = db.users.find((u) => u.UserID === accountId);
  if (!oldUser) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const mapping = CONVERT_MAP[oldUser.UserType];
  if (!mapping) {
    return NextResponse.json(
      { error: `Only ${Object.keys(CONVERT_MAP).join("/")} can be converted.` },
      { status: 400 }
    );
  }
  // A record can carry Status "Converted" with no ConvertedToUserID (seen
  // live on TIN-0001 -- stale seed data, not a real conversion) -- that
  // combination means no real account actually exists yet, so it's allowed
  // through rather than permanently blocked with no way to fix it.
  if (oldUser.Status === "Converted" && oldUser.ConvertedToUserID) {
    return NextResponse.json({ error: "Already converted." }, { status: 400 });
  }

  // TKT-0113: this used to have no readiness check at all -- only the
  // Management UI hid the Convert button before the offer/trial was
  // actually accepted, so the real conversion was reachable directly
  // against this endpoint regardless. Interview's readiness signal is its
  // own item reaching OfferAccepted. Trial has no literal "offer", and
  // its equivalent commitment point is Feedback being submitted (the
  // trial actually happened and Management judged it worth enrolling) --
  // NOT ServiceAdded, which is the trial-enroll route's own flag that
  // only gets set AFTER this conversion, via app/api/trial-enroll/
  // route.js's own requirement that Convert happen first. Gating on
  // ServiceAdded here would make the two routes deadlock each other.
  // TKT-0124: `.find()` picked whichever item happened to sit first for
  // this account, silently assuming exactly one trial/interview item ever
  // exists per account -- real accounts that applied more than once (a
  // different service, a retry) have several, and an earlier stale one
  // sitting first in the array rejected a genuinely eligible conversion.
  // `.some()` checks every item belonging to this account.
  if (oldUser.UserType === "TrialAcc") {
    const trials = db.trialItems.filter((t) => t.TrialAccID === accountId);
    if (!trials.some((t) => t.Status === "FeedbackSubmitted")) {
      return NextResponse.json({ error: "This Trial can't be converted until Feedback has been submitted." }, { status: 400 });
    }
  } else {
    const interviews = db.interviewItems.filter((i) => i.InterviewAccID === accountId);
    if (!interviews.some((i) => i.Status === "OfferAccepted")) {
      return NextResponse.json({ error: "This account can't be converted until the offer has been accepted." }, { status: 400 });
    }
  }

  const { newType, prefix, extra } = mapping;
  const newUserId = await nextId(db, prefix);

  const newUser = {
    UserID: newUserId,
    UserType: newType,
    Name: oldUser.Name,
    Status: "Active",
    Currency: "INR",
    ...(["Student", "Teacher", "Staff", "Ambassador"].includes(newType) ? { Timezone: "Asia/Kolkata" } : {}),
    ...extra(),
  };
  const username = makeUsername(oldUser.Name, db);
  const password = generatePassword();

  db.users.push(newUser);
  db.credentials.push({ UserID: newUserId, Username: username, Password: hashPassword(password) });

  if (newType === "Student") {
    for (const invoice of db.invoices) {
      if (invoice.StudentID === accountId) invoice.StudentID = newUserId;
    }
    // TKT-0207: auto-generate both real Drive files at conversion time
    // instead of requiring Management to click "Generate" on the Edit
    // Account form afterward. Best-effort -- a Drive/Sheets hiccup must
    // never block a real student's conversion; on failure the URL just
    // stays blank, same as before this ticket, and Management can still
    // use the manual "Generate" button.
    try {
      const ts = await createTimesheet({ name: newUser.Name, batch: newUser.Batch || "", accountId: newUserId });
      newUser.TimesheetURL = ts.url;
    } catch (e) {
      console.error("convert: auto Timesheet generation failed", e);
    }
    try {
      const pt = await createProgressTracker({ name: newUser.Name, batch: newUser.Batch || "", accountId: newUserId });
      newUser.ProgressTrackerURL = pt.url;
    } catch (e) {
      console.error("convert: auto Progress Tracker generation failed", e);
    }
  }

  oldUser.Status = "Converted";
  oldUser.ConvertedToUserID = newUserId;

  await writeDB(db, ["users", "credentials", "invoices"]);
  return NextResponse.json({ oldUser, newUser, credentials: { username, password } });
}
