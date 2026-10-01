import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getUserAndCredentials, saveUserAndCredentials } from "@/lib/db";
import { validateUiPreference } from "@/lib/uiPreference";

// Additive endpoint for the new-UI switch (TKT-0322). The signed-in account sets which UI it uses.
// body: { preference: "classic" | "next" }. Only the caller's own record changes, only the UiPreference field.
export async function PATCH(req) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const { preference } = await req.json().catch(() => ({}));
  const { user, cred } = await getUserAndCredentials(session.userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const problem = validateUiPreference(user.UserType, preference);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  user.UiPreference = preference;
  await saveUserAndCredentials(user, cred);
  return NextResponse.json({ preference });
}
