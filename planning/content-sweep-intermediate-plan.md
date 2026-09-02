# Content sweep — current (false) → intermediate (non-lie) → final (real)

Strategy per user direction: don't leave false claims live while waiting
indefinitely for real numbers. Ship an honest INTERMEDIATE version now —
either a true, defensible, conservative number, or copy that describes
method/philosophy instead of an unverifiable outcome stat. Never fabricate
a bigger, better-sounding number as the "safe" fix. FINAL column stays
blank until real data is given — tickets close on the intermediate fix,
reopen (or a new ticket) when real numbers replace it.

| Ticket | Location | Current (false) | Intermediate (non-lie) | Final (real) |
|---|---|---|---|---|
| TKT-0164 | `Hero.tsx` hero stat strip | "98%" First Choice Placement, "40+" Countries Represented | ~~Remove the numbers entirely~~ — superseded, see FINAL column | **DECIDED (2026-09-01):** "98% Grade Improvement Rate" (was First Choice Placement) + "20+ Countries Represented" (was 40+; real count is 21, using a round conservative 20+) |
| TKT-0164 / 0168 | `GlobalReach.tsx` | "STUDENTS FROM 40+ COUNTRIES. ONE STANDARD: EXCEPTIONAL." | ~~"5+ countries" conservative estimate~~ — superseded, see FINAL column | **DECIDED (2026-09-01):** "STUDENTS FROM 20+ COUNTRIES. ONE STANDARD: EXCEPTIONAL." — same real 20+ figure as above, for consistency |
| TKT-0165 / 0176 | `AcademicResults.tsx` `resultsData` | Per-subject %: Maths 96%, Physics 92%, Chemistry 89%, Economics 94%, English 88%, IELTS 91% — tagline "REAL STUDENTS. REAL A*S. NO AIRBRUSHING." | Drop the specific percentages (none are verifiable) — replace the whole block with a method-description, not an outcome claim: "Every session is topic-mapped to the real mark scheme, drilled with real past papers, marked the way examiners actually mark." Tagline softened to "REAL PAST PAPERS. REAL EXAMINER STANDARDS." (drops "NO AIRBRUSHING," which implies a data claim it can't back) | *(pending real per-subject results)* |
| TKT-0166 | `Stats.tsx` `allStats` under "MAKE UNIVERSITIES AN OFFER" | "70+" Students placed at Top 10 UK universities, "40+" Countries, "98%" first choice, "10+" Years of admissions expertise | Same treatment as above — drop the 4 numeric claims, replace the 4-stat grid with 4 real, checkable *feature* claims instead of outcome numbers: "Every session recorded," "Topic-by-topic mastery tracking," "Examiner-style marking," "Structured past-paper drills." Heading softened from "MAKE UNIVERSITIES AN OFFER" (ties to the bigger TKT-0174 framing shift) to "WHY IT WORKS." | *(pending real data + final TKT-0174 framing decision)* |
| TKT-0174 | Site-wide (`Hero.tsx` "OXFORD & CAMBRIDGE-COACHED", `Stats.tsx` heading, `AcademicResults.tsx` uni-placement framing) | Whole site frames around elite-university admissions outcomes | Intermediate: soften the two loudest admissions-framed headlines (Hero subheading, Stats heading — both touched above) toward "coaching/mentoring," without a full site rewrite. Full reframe still needs your 2-3 sentence direction. | *(pending your framing direction — full copy pass)* |
| TKT-0181 | `app/about/page.tsx` lines 80–93 | "500+" Students, "40+" A* Cohorts, "6" Countries | Same treatment: drop the unverifiable "500+" and "40+", keep **6 Countries** only if you can confirm it (I have no basis to verify or lower it, so removing unless confirmed) — replace the 3-stat grid with 2 honest claims: "Every student, a bespoke strategy" / "Small groups, real feedback, real accountability." | *(pending real counts)* |
| TKT-0182 | `app/about/page.tsx` `teachers` array | 6 fully fabricated teacher bios (names, quals, avatars) | No safe non-lie version exists for fabricated PEOPLE — hide the "Meet Our Teachers" section entirely (same pattern already used for Press/Toppers), do not replace with vaguer fake people. | *(pending real teacher list)* |
| TKT-0188 | `app/services/page.tsx` "Why DivergenCIE" section | Heading "NOT A TUITION CENTRE. A RESULTS MACHINE." + stats 98%/100%/40+/10+ | Reword heading to drop the unverifiable "results machine" claim: "NOT A TUITION CENTRE. A COACHING PARTNERSHIP." Drop the 4 numeric stats, replace with the same 4 feature-claims used in TKT-0166's fix (tailored session, topic tracking, examiner marking, past-paper drills) for consistency across the site. | *(pending real data)* |

## What this does NOT touch (already resolved earlier this session)

- TKT-0177 (fake "Students placed at" university list) — deleted.
- TKT-0179 (fake press logos) — hidden.
- TKT-0180 (fake testimonials) — replaced with real ones.
- TKT-0183 (fake World/Country Toppers) — hidden.
- TKT-0189 (affordable positioning) — done, real copy, not a stats issue.

## Real data collected so far (documentation only, not yet applied)

### Countries with real students (per user, 2026-09-01)

21 unique countries: Cayman Islands, Seychelles, Egypt, Saudi Arabia,
UAE, Qatar, US, UK, Australia, India, Pakistan, Bangladesh, Sri Lanka,
Malaysia, Singapore, Indonesia, South Africa, Tanzania, Turkey,
**Sudan, Nigeria**.

("Naiji area" = Nigerian slang for Nigeria ("Naija") — same country
named right after, counted once, not as a separate place.)

Turkey added after cross-checking the app's own real data (live DB +
4 full historical backups): a real Teacher account (Khadija Amatullah)
has a Turkish (+90) WhatsApp number, not otherwise on the user's list.
Everything else the app's data showed (Malaysia, India, Pakistan, Saudi
Arabia) was already listed. Caveat: only 10/62 accounts have a WhatsApp
number and only 3 have a Location filled in, so this check confirms
Turkey but can't rule out other countries the app has no record of.

This replaces the earlier "5+ countries" conservative-estimate placeholder
in the intermediate-fix column above — **21+ Countries** is now a real,
user-confirmed number, not a guess. Not yet applied to any file (Hero.tsx,
GlobalReach.tsx, About page) — waiting for the rest of the content sweep
data before doing one batched pass.

**Note:** TKT-0166 and TKT-0188 also contain a "98%"/"40+ countries" pair
of numbers. The TKT-0164 decision above (98% Grade Improvement Rate,
20+ Countries) isn't automatically applied there — user scoped this
decision to TKT-0164 only ("this is only particular four"). Worth asking
whether the same real numbers should carry over for consistency once
those two tickets are discussed.

## Rule for every intermediate fix above

Never invent a bigger/rounder number to replace a smaller fabricated one.
Where a real, conservative number can be traced from data already
confirmed true elsewhere in the app (e.g. the 5 real regions), use that
exact number, not a rounded-up guess. Everywhere else, drop the number
and describe the real, checkable process instead of an outcome.
