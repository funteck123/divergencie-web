# Website false stats — pending replacement

Faulty text captured as-is from the live code. Replacement column left
blank — plan real numbers before filling in and applying.

| Ticket | Location | Faulty text | Replacement |
| :--- | :--- | :--- | :--- |
| TKT-0164 | `components/Hero.tsx` (homepage hero stat strip) | "98%" / "FIRST CHOICE PLACEMENT", "40+" / "COUNTRIES REPRESENTED" | |
| TKT-0164 | `components/AboutSection.tsx` | "98%" / "First choice placement", "40+" / "Countries represented" | |
| TKT-0164 | `components/GlobalReach.tsx` | "STUDENTS FROM 40+ COUNTRIES. ONE STANDARD: EXCEPTIONAL." | |
| TKT-0165 | `components/AcademicResults.tsx` ("OUR RESULTS" section, `resultsData`) | Mathematics 96%, Physics 92%, Chemistry 89%, Economics 94%, English Language 88%, IELTS 91% (Band 7.5+) — all A*–A, tagline "REAL STUDENTS. REAL A*S. NO AIRBRUSHING." | |
| TKT-0166 | `components/Stats.tsx` (`allStats`, under "MAKE UNIVERSITIES AN OFFER") | "70+" Students placed at Top 10 UK universities, "40+" Countries, "98%" first choice, "10+" Years of admissions expertise | |
| TKT-0168 | `components/GlobalReach.tsx` | Same "40+ COUNTRIES" line as above — also the source of the "goes global" numbers ticket refers to | |

Not yet located: the specific "DivergenCIE goes global" heading text itself
— `GlobalReach.tsx` has the "STUDENTS FROM 40+ COUNTRIES" line but no
literal "goes global" heading found; may be the same section under a
different heading, worth confirming against the live page before editing.
