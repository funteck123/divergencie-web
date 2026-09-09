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
// enrolled subjects. Every other proxied path (fetch-and-digitize,
// digitize, attempts, progress, leaderboard) is a plain pass-through with
// NO server-side enforcement that the requested paper actually belongs to
// an enrolled subject -- a student who already knows a qpId/msId from
// elsewhere could still fetch it. Real enforcement there needs the same
// subject-matching applied to the requested paper before proxying, not
// just hiding it from the picker UI. Not yet built.
//
// TKT-0231: this used to key off Service.Board, which is literally the
// string "Cambridge" on every real Service -- the upstream library's own
// board keys are "IGCSE"/"A Levels", so "cambridge physics" never matched
// "igcse physics" under any normalization, and the filter silently
// returned an EMPTY library for every non-Management student regardless
// of real enrollment. Service.Course already holds "IGCSE"/"A-Level",
// matching the library's naming almost exactly -- BOARD_ALIASES below
// covers the one real gap (plural "A Levels"). SUBJECT_ALIASES covers the
// one confirmed subject-name mismatch (ICT). Both confirmed against the
// real live library (GET /api/mcq/library as Management) and real live
// Service records, not assumed.
const BOARD_ALIASES = { "a-level": "a levels", "a level": "a levels" };
const SUBJECT_ALIASES = { "information & communication technology": "ict" };

function normalizeSubjectKey(s) {
  return String(s || "").toLowerCase().replace(/[\s-]+/g, " ").trim();
}

function subjectMatchKey(course, subjectName) {
  const boardKey = normalizeSubjectKey(course);
  const subjectKey = normalizeSubjectKey(subjectName);
  return `${BOARD_ALIASES[boardKey] || boardKey} ${SUBJECT_ALIASES[subjectKey] || subjectKey}`;
}

// TKT-0233: enrolledSubjectKeys() never checked enrollment dates at all --
// an ENDED enrollment kept showing its subject forever. Confirmed live and
// currently reproducible: a real Teacher (TCH-0002) whose enrollment ended
// 2026-09-01 still saw that subject 3 days later. Day-level (today must
// fall within [StartDate, EndDate]), not lib/billing.js's
// isEnrollmentActiveForMonth -- that's month-granularity for billing's own
// coarser needs (an enrollment ending on the 1st of a month still counts
// as active for that whole month there), which would have been too
// lenient for "should this show up right now."
function isEnrollmentActiveToday(enrollment) {
  const today = new Date().toISOString().slice(0, 10);
  if (enrollment.StartDate && enrollment.StartDate > today) return false;
  if (enrollment.EndDate && enrollment.EndDate < today) return false;
  return true;
}

async function enrolledSubjectKeys(userId) {
  const db = await readDB();
  const activeServiceIds = new Set(
    (db.enrollments || []).filter((e) => e.UserID === userId && isEnrollmentActiveToday(e)).map((e) => e.ServiceID)
  );
  const keys = new Set();
  for (const service of db.services || []) {
    if (!activeServiceIds.has(service.ServiceID)) continue;
    if (service.Course && service.SubjectName) {
      keys.add(subjectMatchKey(service.Course, service.SubjectName));
    }
  }
  return keys;
}

function filterLibraryByEnrollment(library, allowedKeys) {
  const filtered = {};
  for (const [board, subjects] of Object.entries(library)) {
    for (const [subject] of Object.entries(subjects)) {
      const key = subjectMatchKey(board, subject);
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

  let upstream;
  try {
    upstream = await fetch(`${extractionUrl}/api/${subPath}${search}`);
  } catch (e) {
    // The whole reason this URL needs re-configuring after every restart
    // is that the tunnel is unstable -- an unreachable tunnel must not
    // surface as an unhandled exception/raw 500.
    return NextResponse.json({ error: `Extraction service unreachable: ${e.message}` }, { status: 503 });
  }

  // TKT-0245: "View QP PDF" / "View MS PDF" streams a raw PDF, not JSON --
  // every other proxied GET response is parsed as JSON below, which would
  // corrupt binary PDF bytes trying to round-trip them through JSON.parse.
  if (subPath === "pdf") {
    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({ error: `Upstream returned ${upstream.status}.` }));
      return NextResponse.json(errBody, { status: upstream.status });
    }
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/pdf",
        "Content-Disposition": upstream.headers.get("content-disposition") || "attachment",
      },
    });
  }

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

  let upstream;
  try {
    upstream = await fetch(`${extractionUrl}/api/${subPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyText,
    });
  } catch (e) {
    return NextResponse.json({ error: `Extraction service unreachable: ${e.message}` }, { status: 503 });
  }
  const body = await upstream.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Extraction service returned an invalid response." }, { status: 502 });
  }
  return NextResponse.json(body, { status: upstream.status });
}
