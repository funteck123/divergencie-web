import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { listBoards } from "@/lib/whiteboard/wbStore";
import { SESSION_ID } from "@/lib/whiteboard/wbRules";

// TKT-0443: the signed-in person's own whiteboards, newest first. ?session=<id> keeps only the boards linked to that class session.
export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const s = new URL(req.url).searchParams.get("session");
  if (s && !SESSION_ID.test(s)) return NextResponse.json({ error: "Bad session id." }, { status: 400 });
  try { return NextResponse.json(await listBoards(session.userId, s || undefined), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
