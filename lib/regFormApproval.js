import { nextId } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/passwords";

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

// RequestedType -> the pending UserType/ID prefix it creates on approval.
export const REQUEST_TYPE_MAP = {
  Trial: { userType: "TrialAcc", prefix: "TRL" },
  TeacherInterview: { userType: "TeacherInterviewAcc", prefix: "TIN" },
  StaffInterview: { userType: "StaffInterviewAcc", prefix: "SIN" },
  AmbassadorInterview: { userType: "AmbassadorInterviewAcc", prefix: "AIN" },
};

// Shared by the manual Approve button (api/regforms PATCH) and TKT-0203's
// auto-approval path (api/register POST) -- same account-creation logic
// either way, only the trigger differs. Mutates `db` in place (caller
// still owns readDB/writeDB); does not throw for a bad RequestedType, the
// caller already validated that at submission/approval time.
export async function approveRegForm(db, form) {
  const mapping = REQUEST_TYPE_MAP[form.RequestedType];
  if (!mapping) throw new Error(`Unknown RequestedType "${form.RequestedType}".`);
  const { userType, prefix } = mapping;
  const userId = await nextId(db, prefix);

  const user = {
    UserID: userId,
    UserType: userType,
    Name: form.Name,
    Status: "Active",
    Currency: "INR",
    ...(form.Email ? { Email: form.Email } : {}),
  };
  const username = makeUsername(form.Name, db);
  const password = generatePassword();
  db.users.push(user);
  db.credentials.push({ UserID: userId, Username: username, Password: hashPassword(password) });

  form.Status = "Approved";
  form.CreatedUserID = userId;

  return { user, credentials: { username, password } };
}
