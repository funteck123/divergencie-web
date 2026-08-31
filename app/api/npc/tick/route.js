import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/authz";
import { tickAllNpcs, tickNpc, loadApprovals, saveApprovals } from "@/lib/npc/engine";

// Management-only trigger for the NPC engine (lib/npc/engine.js). v1 has no
// automatic scheduler wired up -- this route is the manual/cron entry
// point, called with the deployed app's own base URL so the engine's
// internal API calls hit the real, live app exactly like a real user's
// browser would (see lib/npc/actions.js's callApi()).
//
// body: {} to tick every NPC in lib/npc/state/, or { npcFile: "foo.json" }
// for just one. Optional { simulatedToday: "YYYY-MM-DD" } overrides the
// engine's own notion of "today" for that call ONLY -- used to drive a
// multi-month storyline forward one simulated day at a time without
// touching the real system clock. The real app's own data (schedule
// items, invoices, etc.) is never faked; it's still generated against the
// real current date (lib/scheduleGen.js's horizon is "today" through the
// end of next month, anchored to the real clock, not this override), so a
// simulated date beyond that real horizon will correctly find nothing
// scheduled rather than fabricating a match.
export async function POST(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { npcFile, simulatedToday } = await req.json().catch(() => ({}));
  const baseUrl = new URL(req.url).origin;
  const today = simulatedToday || new Date().toISOString().slice(0, 10);

  let results;
  if (npcFile) {
    // engine.js's resolveNpcPath() throws on anything that isn't a bare
    // "<word-chars>.json" filename (the /swe review's CRITICAL path-
    // traversal fix) -- caught here so an invalid npcFile is a clean 400,
    // not a raw 500.
    try {
      const approvals = await loadApprovals();
      results = [await tickNpc(npcFile, { baseUrl, today, approvals })];
      await saveApprovals(approvals);
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  } else {
    results = await tickAllNpcs({ baseUrl, today });
  }
  return NextResponse.json({ today, results });
}
