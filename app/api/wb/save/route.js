import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { saveBoard } from "@/lib/whiteboard/wbStore";
import { MAX_BODY_BYTES, SESSION_ID, WB_ID, validBoard } from "@/lib/whiteboard/wbRules";

// TKT-0443: saves one board into the signed-in person's own folder. A copy with under half the marks of the stored one is refused (409) unless it says force.
export async function POST(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const q = new URL(req.url).searchParams;
  const id = q.get("id") || "";
  const sessionId = q.get("session") || undefined;
  if (!WB_ID.test(id)) return NextResponse.json({ error: "Bad board id." }, { status: 400 });
  if (sessionId && !SESSION_ID.test(sessionId)) return NextResponse.json({ error: "Bad session id." }, { status: 400 });
  const text = await req.text();
  if (!text || text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Board too large to save online. It stays saved in this browser." }, { status: 413 });
  let board;
  try { board = JSON.parse(text); } catch { return NextResponse.json({ error: "Not JSON." }, { status: 400 }); }
  if (!validBoard(id, board)) return NextResponse.json({ error: "Not a board." }, { status: 400 });
  const force = board.force === true;
  delete board.force;
  try {
    const r = await saveBoard(session.userId, id, board, { force, sessionId });
    return r.status === 409 ? new NextResponse("kept the larger copy", { status: 409 }) : new NextResponse("ok");
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
