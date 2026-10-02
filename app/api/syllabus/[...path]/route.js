import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getSyllabusViewerUrl } from "@/lib/mcqConfig";
import { scopedAccount, topicCompleteBody, upstreamTarget } from "@/lib/syllabusProxy";

// Same-origin proxy to the Syllabus Viewer service (prototypes/syllabus-digitizer/server.mjs), which stays on its own
// always-on machine behind a tunnel, like the Question Solver. The browser never sees the tunnel URL. The session decides
// whose progress is read or written (see lib/syllabusProxy.js). Added for the new UI; the classic page still links to the
// tunnel directly and is unchanged.

async function viewerUrl() {
  try {
    return { url: await getSyllabusViewerUrl() };
  } catch (e) {
    return { error: NextResponse.json({ error: e.message }, { status: 503 }) };
  }
}

export async function GET(req, { params }) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const { path } = await params;
  const target = upstreamTarget(path);
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { url, error: cfgError } = await viewerUrl();
  if (cfgError) return cfgError;
  if (!url) return NextResponse.json({ error: "Syllabus Viewer URL not configured yet." }, { status: 503 });

  const incoming = new URL(req.url);
  if (path[0] === "progress" && path.length === 1) incoming.searchParams.set("account", scopedAccount(session, incoming.searchParams.get("account")));
  const search = target.binary ? "" : incoming.search;

  let upstream;
  try {
    upstream = await fetch(`${url}${target.path}${search}`);
  } catch (e) {
    return NextResponse.json({ error: `Syllabus Viewer unreachable: ${e.message}` }, { status: 503 });
  }
  if (target.binary) {
    if (!upstream.ok) return NextResponse.json({ error: "Image not found." }, { status: upstream.status === 404 ? 404 : 502 });
    return new NextResponse(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") || "image/png", "Cache-Control": "private, max-age=86400" } });
  }
  const body = await upstream.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: `Syllabus Viewer did not answer properly (upstream status ${upstream.status}). Wait a minute and try again.` }, { status: 502 });
  return NextResponse.json(body, { status: upstream.status });
}

export async function POST(req, { params }) {
  const { session, error } = requireSession(req);
  if (error) return error;
  const { path } = await params;
  if (path.length !== 1 || path[0] !== "topic-complete") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = topicCompleteBody(session, await req.json().catch(() => null));
  if (!body) return NextResponse.json({ error: "subject and nodeKey are required." }, { status: 400 });
  const { url, error: cfgError } = await viewerUrl();
  if (cfgError) return cfgError;
  if (!url) return NextResponse.json({ error: "Syllabus Viewer URL not configured yet." }, { status: 503 });
  let upstream;
  try {
    upstream = await fetch(`${url}/api/topic-complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    return NextResponse.json({ error: `Syllabus Viewer unreachable: ${e.message}` }, { status: 503 });
  }
  const out = await upstream.json().catch(() => null);
  if (out === null) return NextResponse.json({ error: `Syllabus Viewer did not answer properly (upstream status ${upstream.status}).` }, { status: 502 });
  return NextResponse.json(out, { status: upstream.status });
}
