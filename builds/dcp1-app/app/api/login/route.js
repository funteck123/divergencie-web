import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";

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
  if (user.Status === "Converted") {
    return NextResponse.json(
      { error: "This account was converted and can no longer log in. Use your new account credentials." },
      { status: 403 }
    );
  }

  return NextResponse.json({ user });
}
