import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getMcqExtractionUrl } from "@/lib/mcqConfig";

// TKT-0244: attempt-history/leaderboard title lookup, deliberately
// UNFILTERED by current enrollment (unlike GET /api/mcq/library, which
// [...path]/route.js filters per session for exactly this reason: what a
// student can newly BROWSE should be enrollment-gated). A past attempt's
// paper title is not a "what can this student access" question -- it's
// "what did this student already do," which must stay visible even after
// an enrollment ends or a subject-key mismatch hides it from the picker.
// Without this, paperTitleById (built only from the filtered /library
// response) falls back to the raw Drive file id for any such paper, and a
// real student's own history/leaderboard row showed a string like
// "14XDKcQOkMsZCpH1YMv-bWYXyy9v6f_mO" instead of a readable worksheet name.
//
// Static route takes precedence over the [...path] catch-all for this
// exact path (standard Next.js routing) -- no conflict with the proxy.
export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const extractionUrl = await getMcqExtractionUrl();
  if (!extractionUrl) {
    return NextResponse.json({ error: "MCQ extraction service URL not configured yet." }, { status: 503 });
  }

  let upstream;
  try {
    upstream = await fetch(`${extractionUrl}/api/library`);
  } catch (e) {
    return NextResponse.json({ error: `Extraction service unreachable: ${e.message}` }, { status: 503 });
  }
  const library = await upstream.json().catch(() => null);
  if (library === null) {
    return NextResponse.json({ error: "Extraction service returned an invalid response." }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json(library, { status: upstream.status });
  }

  const titles = {};
  for (const subjects of Object.values(library)) {
    for (const components of Object.values(subjects)) {
      for (const papers of Object.values(components)) {
        for (const p of papers) {
          if (p.qpId) titles[p.qpId] = p.title;
        }
      }
    }
  }
  return NextResponse.json(titles);
}
