import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getAsset, putAsset } from "@/lib/whiteboard/wbStore";
import { MAX_BODY_BYTES, WB_ASSET_ID, WB_ASSET_TYPES } from "@/lib/whiteboard/wbRules";

// TKT-0443: pictures, video, audio and PDF placed on a board. Stored under the signed-in person's folder by checksum. A function takes a body of at most 4.5 MB, so larger files are refused (413).
export async function POST(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const ext = (new URL(req.url).searchParams.get("ext") || "").toLowerCase();
  if (!WB_ASSET_TYPES[ext]) return NextResponse.json({ error: "type not allowed" }, { status: 400 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BODY_BYTES) return NextResponse.json({ error: "File too large. The limit is 4 MB." }, { status: 413 });
  try { return NextResponse.json({ id: await putAsset(session.userId, ext, bytes) }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}

export async function GET(req) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!WB_ASSET_ID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const a = await getAsset(session.userId, id);
    if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // sandbox + nosniff: a picture or SVG opened on its own page can never run a script on this site
    return new NextResponse(a.bytes, { headers: { "Content-Type": a.type, "Cache-Control": "private, max-age=31536000, immutable", "Content-Security-Policy": "sandbox", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
