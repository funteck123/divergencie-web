import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { sessionCookieFor } from "@/lib/session";

export async function POST(req) {
  const { username, password } = await req.json();
  const db = readDB();

  const cred = db.credentials.find(
    (c) => c.Username === username && c.Password === password
  );
  if (!cred) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const user = db.users.find((u) => u.UserID === cred.UserID);
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  // A converted TrialAcc/InterviewAcc still logs in as itself — it's reused to
  // request Trials/Interviews for other Services later, not a one-time login.

  const res = NextResponse.json({ user });
  const cookie = sessionCookieFor(user);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
