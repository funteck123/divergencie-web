# Website false stats — pending replacement

Faulty text captured as-is from the live code. Replacement column left
blank — plan real numbers before filling in and applying.

| Ticket | Location | Faulty text | Replacement |
| :--- | :--- | :--- | :--- |
| TKT-0164 | `components/Hero.tsx` (homepage hero stat strip) | "98%" / "FIRST CHOICE PLACEMENT", "40+" / "COUNTRIES REPRESENTED" | |
| TKT-0164 | `components/AboutSection.tsx` | ~~"98%" / "First choice placement", "40+" / "Countries represented"~~ | **Already removed** — deleted entirely (not replaced) in commit 1abdc01, as part of the "ARE YOU?" card fix for TKT-0172/0173. |
| TKT-0164 | `components/GlobalReach.tsx` | "STUDENTS FROM 40+ COUNTRIES. ONE STANDARD: EXCEPTIONAL." | |
| TKT-0165 | `components/AcademicResults.tsx` ("OUR RESULTS" section, `resultsData`) | Mathematics 96%, Physics 92%, Chemistry 89%, Economics 94%, English Language 88%, IELTS 91% (Band 7.5+) — all A*–A, tagline "REAL STUDENTS. REAL A*S. NO AIRBRUSHING." | |
| TKT-0166 | `components/Stats.tsx` (`allStats`, under "MAKE UNIVERSITIES AN OFFER") | "70+" Students placed at Top 10 UK universities, "40+" Countries, "98%" first choice, "10+" Years of admissions expertise | |
| TKT-0168 | `components/GlobalReach.tsx` | Same "40+ COUNTRIES" line as above — also the source of the "goes global" numbers ticket refers to | |
| TKT-0176 | `components/AcademicResults.tsx` — same file/section as TKT-0165, same `resultsData` numbers | See TKT-0165 row above — this is the same content, not a separate location | |
| TKT-0177 | `components/AcademicResults.tsx` lines 66–77 | "Students placed at" label + hardcoded university list (Oxford, Cambridge, LSE, Imperial, UCL, Durham, Warwick, Edinburgh, King's College, St Andrews) + "30+ more" badge — implies real placement outcomes with no real data behind it | |
| TKT-0181 | `app/about/page.tsx` lines 80–93 | "500+" Students, "40+" A* Cohorts, "6" Countries | |
| TKT-0174 | Site-wide, not one file — `components/Hero.tsx` ("OXFORD & CAMBRIDGE-COACHED"), `components/Stats.tsx` ("MAKE UNIVERSITIES AN OFFER"), `components/AcademicResults.tsx` (university placement list) all frame the site around elite-university admissions rather than mentoring/classes | Needs a content direction decision first (what the new framing should say), not just a number swap — larger than the other rows here. | |
| TKT-0180 | `components/Testimonials.tsx` (`testimonials` array) | 3 fabricated testimonials with fake names/quotes/badges: "Aisha M." (A* Achieved), "Rohan K." (A* Achieved), "Sara B." (LSE Offer) | |
| TKT-0182 | `app/about/page.tsx` (`teachers` array near top of file) | Fabricated teacher bios — e.g. "Aisha Rahman", "Sarah Al-Amin" with invented quals | **BLOCKER — needs real teacher names/roles/subjects/quals/photos from user before this can be edited.** Flagged, not started. |
| TKT-0179 | `components/Press.tsx` (`pressLogos` array) | 8 fabricated press mentions: The Guardian Education, Times Higher Education, BBC Learning, The Independent, The Telegraph Education, EdSurge, Tes Magazine, Varsity — no evidence DivergenCIE has actually been covered by any of these | |
| TKT-0188 | `app/services/page.tsx` lines 197, 216–219 ("Why DivergenCIE" section) | Heading "NOT A TUITION CENTRE. A RESULTS MACHINE." + stats "98%" First Choice Placement, "100%" Bespoke Strategy, "40+" Countries Reached, "10+" Years Expertise | |
| TKT-0189 | Pricing page — no "affordable" messaging currently exists anywhere | New copy needed, not a replacement of existing false text | |

Not yet located: the specific "DivergenCIE goes global" heading text itself
— `GlobalReach.tsx` has the "STUDENTS FROM 40+ COUNTRIES" line but no
literal "goes global" heading found; may be the same section under a
different heading, worth confirming against the live page before editing.
