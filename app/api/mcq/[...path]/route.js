import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { readDB } from "@/lib/db";
import { getMcqExtractionUrl } from "@/lib/mcqConfig";

// Server-to-server proxy to the mcq-digitizer extraction service
// (prototypes/mcq-digitizer/server.mjs), which stays on its own always-on
// machine per the "Option B" migration decision -- see
// planning/mcq-digitizer-integration-plan.md. Students never see or need
// the Cloudflare tunnel URL directly; the browser only ever talks to this
// same-origin route, keyed by their real session instead of a URL param.
//
// SCOPING NOTE (deliberately incomplete, flagged rather than overclaimed):
// only GET /api/mcq/library is currently filtered to the session's own
// enrolled subjects (via Board+SubjectName string match against the
// upstream board/subject keys -- normalized case/hyphen/whitespace, but
// NOT yet verified against real live data). Every other proxied path
// (fetch-and-digitize, digitize, attempts, progress, leaderboard) is a
// plain pass-through with NO server-side enforcement that the requested
// paper actually belongs to an enrolled subject -- a student who already
// knows a qpId/msId from elsewhere could still fetch it. Real enforcement
// there needs the same subject-matching applied to the requested paper
// before proxying, not just hiding it from the picker UI. Not yet built.
function normalizeSubjectKey(s) {
  return String(s || "").toLowerCase().replace(/[\s-]+/g, " ").trim();
}

async function enrolledSubjectKeys(userId) {
  const db = await readDB();
  const activeServiceIds = new Set(
    (db.enrollments || []).filter((e) => e.UserID === userId).map((e) => e.ServiceID)
  );
  const keys = new Set();
  for (const service of db.services || []) {
    if (!activeServiceIds.has(service.ServiceID)) continue;
    if (service.Board && service.SubjectName) {
      keys.add(normalizeSubjectKey(`${service.Board} ${service.SubjectName}`));
    }
  }
  return keys;
}

function filterLibraryByEnrollment(library, allowedKeys) {
  const filtered = {};
  for (const [board, subjects] of Object.entries(library)) {
    for (const [subject] of Object.entries(subjects)) {
      const key = normalizeSubjectKey(`${board} ${subject}`);
      if (!allowedKeys.has(key)) continue;
      filtered[board] = filtered[board] || {};
      filtered[board][subject] = subjects[subject];
    }
  }
  return filtered;
}

export async function GET(req, { params }) {
  const { session, error } = requireSession(req);
  if (error) return error;

  const extractionUrl = await getMcqExtractionUrl();
  if (!extractionUrl) {
    return NextResponse.json({ error: "MCQ extraction service URL not configured yet." }, { status: 503 });
  }

  const { path } = await params;
  const subPath = path.join("/");
  const search = new URL(req.url).search;

  const upstream = await fetch(`${extractionUrl}/api/${subPath}${search}`);
  const body = await upstream.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Extraction service returned an invalid response." }, { status: 502 });
  }

  if (subPath === "library" && upstream.ok) {
    // Management sees the full, unfiltered library -- everyone else only
    // sees subjects they're actually enrolled in.
    if (session.userType !== "Management") {
      const allowedKeys = await enrolledSubjectKeys(session.userId);
      return NextResponse.json(filterLibraryByEnrollment(body, allowedKeys));
    }
  }

  return NextResponse.json(body, { status: upstream.status });
}

export async function POST(req, { params }) {
  const { error } = requireSession(req);
  if (error) return error;

  const extractionUrl = await getMcqExtractionUrl();
  if (!extractionUrl) {
    return NextResponse.json({ error: "MCQ extraction service URL not configured yet." }, { status: 503 });
  }

  const { path } = await params;
  const subPath = path.join("/");
  const bodyText = await req.text();

  const upstream = await fetch(`${extractionUrl}/api/${subPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyText,
  });
  const body = await upstream.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Extraction service returned an invalid response." }, { status: 502 });
  }
  return NextResponse.json(body, { status: upstream.status });
}
