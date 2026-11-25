import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getBoard } from "@/lib/whiteboard/wbStore";
import { WB_ID } from "@/lib/whiteboard/wbRules";

// TKT-0443: one of the signed-in person's own boards. Another person's id answers 404, never their board.
export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!WB_ID.test(id)) return NextResponse.json({ error: "Bad board id." }, { status: 400 });
  try {
    const b = await getBoard(session.userId, id);
    return b ? NextResponse.json(b, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Board not found." }, { status: 404 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
