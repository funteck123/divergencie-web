import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { requireManagement } from "@/lib/authz";
import { approveRegForm } from "@/lib/regFormApproval";

export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const db = await readDB();
  // Password is hashed now (lib/passwords.js) and no longer returned here
  // -- see the matching fix in app/api/users/route.js's GET for why.
  const regForms = db.regForms.map((form) => {
    if (!form.CreatedUserID) return form;
    const cred = db.credentials.find((c) => c.UserID === form.CreatedUserID);
    return cred ? { ...form, Username: cred.Username } : form;
  });
  return NextResponse.json({ regForms });
}

// action: "approve" | "reject"
export async function PATCH(req) {
  const { error: authError } = requireManagement(req);
  if (authError) return authError;

  const { regFormId, action } = await req.json();
  const db = await readDB();

  const form = db.regForms.find((r) => r.RegFormID === regFormId);
  if (!form) return NextResponse.json({ error: "RegForm not found." }, { status: 404 });
  if (form.Status !== "Pending") {
    return NextResponse.json({ error: `RegForm already ${form.Status}.` }, { status: 400 });
  }

  if (action === "reject") {
    form.Status = "Rejected";
    await writeDB(db, ["regForms"]);
    return NextResponse.json({ regForm: form });
  }

  if (action === "approve") {
    let result;
    try {
      result = await approveRegForm(db, form);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    await writeDB(db, ["regForms", "users", "credentials"]);

    return NextResponse.json({ regForm: form, user: result.user, credentials: result.credentials });
  }

  return NextResponse.json({ error: "action must be approve or reject." }, { status: 400 });
}
