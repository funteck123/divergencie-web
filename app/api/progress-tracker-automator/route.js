import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/authz";
import { createProgressTracker } from "@/lib/progressTrackerAutomator";

// Mirrors app/api/timesheet-automator/route.js -- backs the "Generate
// Progress Tracker URL" button on a Student's Edit Account form. Creates a
// real Progress Tracker in Drive (duplicate template, fill cells, rename)
// and hands back just the link; the admin still has to Save on the account
// themselves. This route never writes to db.users.
// body: { name, batch?, accountId? }
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { name, batch, accountId } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const result = await createProgressTracker({ name, batch, accountId });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
