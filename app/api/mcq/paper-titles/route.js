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

  // TKT-0258 (2026-09-21 audit): the flattened `titles` map below discards
  // which board+subject each paper belongs to -- fine for just showing a
  // readable title, not enough to fill in a chapter NAME for a subject
  // outside the viewer's current enrollment, since the client can't
  // reliably reconstruct "<board> <subject>" (as used everywhere else,
  // e.g. "A Levels Mathematics") by parsing it back out of the paper's
  // filename text (which spells it differently -- "A Level Maths"). This
  // full unfiltered `library` object already has the real board/subject
  // structure right here; keeping it (as `subjects`, qpId -> "board
  // subject") instead of throwing it away fixes that at the source.
  const titles = {};
  const subjects = {};
  for (const [board, boardSubjects] of Object.entries(library)) {
    for (const [subject, components] of Object.entries(boardSubjects)) {
      for (const papers of Object.values(components)) {
        for (const p of papers) {
          if (!p.qpId) continue;
          titles[p.qpId] = p.title;
          subjects[p.qpId] = `${board} ${subject}`;
        }
      }
    }
  }
  return NextResponse.json({ titles, subjects });
}
