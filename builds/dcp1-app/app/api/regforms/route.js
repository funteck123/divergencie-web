import { NextResponse } from "next/server";
import { readDB, writeDB, nextId } from "@/lib/db";

export async function GET() {
  const db = readDB();
  const regForms = db.regForms.map((form) => {
    if (!form.CreatedUserID) return form;
    const cred = db.credentials.find((c) => c.UserID === form.CreatedUserID);
    return cred ? { ...form, Username: cred.Username, Password: cred.Password } : form;
  });
  return NextResponse.json({ regForms });
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

// RequestedType -> the pending UserType/ID prefix it creates on approval.
// Each Interview track produces its own distinct pending account so it
// converts to the right final type later (see CONVERT_MAP in
// api/convert/route.js) — mirrors ID_PREFIX in api/users/route.js.
const REQUEST_TYPE_MAP = {
  Trial: { userType: "TrialAcc", prefix: "TRL" },
  TeacherInterview: { userType: "TeacherInterviewAcc", prefix: "TIN" },
  StaffInterview: { userType: "StaffInterviewAcc", prefix: "SIN" },
  AmbassadorInterview: { userType: "AmbassadorInterviewAcc", prefix: "AIN" },
};

// action: "approve" | "reject"
export async function PATCH(req) {
  const { regFormId, action } = await req.json();
  const db = readDB();

  const form = db.regForms.find((r) => r.RegFormID === regFormId);
  if (!form) return NextResponse.json({ error: "RegForm not found." }, { status: 404 });
  if (form.Status !== "Pending") {
    return NextResponse.json({ error: `RegForm already ${form.Status}.` }, { status: 400 });
  }

  if (action === "reject") {
    form.Status = "Rejected";
    writeDB(db);
    return NextResponse.json({ regForm: form });
  }

  if (action === "approve") {
    const mapping = REQUEST_TYPE_MAP[form.RequestedType];
    if (!mapping) {
      return NextResponse.json({ error: `Unknown RequestedType "${form.RequestedType}".` }, { status: 400 });
    }
    const { userType, prefix } = mapping;
    const userId = nextId(db, prefix);

    const user = {
      UserID: userId,
      UserType: userType,
      Name: form.Name,
      Status: "Active",
      Currency: "INR",
    };
    const username = makeUsername(form.Name, db);
    const password = randomPassword();
    db.users.push(user);
    db.credentials.push({ UserID: userId, Username: username, Password: password });

    form.Status = "Approved";
    form.CreatedUserID = userId;
    writeDB(db);

    return NextResponse.json({ regForm: form, user, credentials: { username, password } });
  }

  return NextResponse.json({ error: "action must be approve or reject." }, { status: 400 });
}
