import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/authz";
import { createTimesheet } from "@/lib/timesheetAutomator";

// TKT-0158: backs the "Generate Timesheet URL" button on a Student's Edit
// Account form -- creates a real Timesheet in Drive (duplicate template,
// fill cells, rename) and hands back just the link, which the admin still
// has to Save on the account themselves (this route never writes to
// db.users -- see lib/timesheetAutomator.js's own note on why it stays
// scoped to "input in, a Sheet out").
// body: { name, batch?, currency?, rate?, link?, course?, accountId? }
// accountId (a real UserID) makes this idempotent -- see
// lib/timesheetAutomator.js's own note. The admin button always sends the
// account being edited; nothing stops a caller omitting it, but then loses
// the anti-duplicate protection entirely.
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { name, batch, currency, rate, link, course, accountId } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const result = await createTimesheet({ name, batch, currency, rate, link, course, accountId });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
