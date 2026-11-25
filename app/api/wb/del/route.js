import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { deleteBoard } from "@/lib/whiteboard/wbStore";
import { WB_ID } from "@/lib/whiteboard/wbRules";

// TKT-0443: deletes one of the signed-in person's own boards. The board goes to a trash folder; it is not erased.
export async function POST(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!WB_ID.test(id)) return NextResponse.json({ error: "Bad board id." }, { status: 400 });
  try { await deleteBoard(session.userId, id); return new NextResponse("ok"); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
