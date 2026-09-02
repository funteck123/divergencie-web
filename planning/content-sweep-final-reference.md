# Content sweep — final reference

Source of truth for every real number, name, and claim now live on the public
site after the 2026-08 content sweep (TKT-164 through TKT-192). Cross-check
here before changing any of these again, instead of re-deriving from scratch.

## Data sources used

- `data/DC Database 2026_Cleaned_2026-06-12.xlsx` — Team sheet (staff),
  Recruits sheet (candidates/subjects), Batches, Students.
- Live app DB via `/api/users`.
- `study/dc-feedbacks/` (gitignored) — real WhatsApp testimonial quotes.
- `study/results/` (gitignored) — real IGCSE certificate (Maanvi Mittal).
- User-confirmed verbal facts (start year, class size, etc.) where no
  record exists in the Excel or app DB.

## Countries (21 confirmed, `components/GlobalReach.tsx` / stat copy)

Cayman Islands, Seychelles, Egypt, Saudi Arabia, UAE, Qatar, US, UK,
Australia, India, Pakistan, Bangladesh, Sri Lanka, Malaysia, Singapore,
Indonesia, South Africa, Tanzania, Turkey, Sudan, Nigeria.

Site copy rounds this down to "20+ Countries" everywhere (Hero, Stats,
GlobalReach, services page).

## Company facts

- Founded 2022 → "4+ Years of mentoring expertise" (services page, Stats).
  Do not say "10 years" anywhere — that was fabricated and has been removed.
- ~300 students mentored total → "300+ Students" (About hero stat grid).
- Real group class size is 40 students — **not** used as a marketing stat,
  user said to ignore it for copy purposes.

## `components/Stats.tsx` — homepage stat grid (`allStats`)

| Value | Label |
|---|---|
| 70+ | Students mentored for placement at Top 10 UK universities |
| 20+ | Countries our students come from |
| 98% | Grade Improvement Rate |
| 4+ | Years of mentoring expertise |
| 0x | Recycled essays. Ever. |
| 0% | Generic advice. Zero tolerance. |
| 100% | Bespoke strategy, every student. |
| 1st | Country & World Topper certified coaches. |

Heading "MAKE UNIVERSITIES AN OFFER" deliberately unchanged (that framing
question is TKT-0174, on hold — see below).

## `app/about/page.tsx` — hero stats

300+ Students · 20+ A* Cohorts · 20+ Countries.

## `components/Hero.tsx` / `components/GlobalReach.tsx`

- Hero floating cards: "98% Grade Improvement Rate", "20+ Countries
  Represented" (was fabricated 98%/40+).
- GlobalReach heading: "STUDENTS FROM 20+ COUNTRIES. ONE STANDARD:
  EXCEPTIONAL." (was 40+).

## `components/AcademicResults.tsx`

Real IGCSE result: Maanvi Mittal, 8 subjects, all A*. Mathematics listed
first. Tagline: "Since 2022: Real A*s, Talented Students." University
placement list commented out (not deleted) — no verified placement data
exists yet.

## `components/Testimonials.tsx`

3 real testimonials, sourced from `study/dc-feedbacks/`:
Hamsini Uphadyayula, Ayaan Kanwar's Parent, Muhammad Anas's Parent.

## `components/Press.tsx`

Real outlets only: Saudi Gazette, ANI News, The Tribune (India) — confirmed
via web search to cover the Cambridge topper-award category (not DivergenCIE
by name). No UK outlet found; none fabricated.

## `app/services/page.tsx`

"Why DivergenCIE" stats: 98% Grade Improvement Rate, 20+ Countries, 4+ Years
of Mentoring Expertise. "Cambridge Authorised" / "CollegeBoard Partner"
badges removed (unverifiable legal claims). "IB Specialist(s)" kept —
marketing term, not a legal partnership claim. Heading "NOT A TUITION
CENTRE. A RESULTS MACHINE." deliberately kept.

## `app/pricing/page.tsx`

Relative price tiers ($/$/$$) replace fabricated absolute figures. "WhatsApp"
word removed from doubt-resolution copy (channel not guaranteed). Local
Payment Methods section commented out — no verified payment-method list.

## `app/about/page.tsx` — Teachers (`teachers` array)

Real active teachers (Team sheet, Type=teacher), cross-referenced against
Recruits for subjects. Generic `UserRound` icon, no photos, no fabricated
qualification text or "Subject Lead" badges.

| Name | Subjects |
|---|---|
| Mohammad Shahid Akhtar | A Level Computer Science · Math · Physics · Chemistry · English |
| Muhammad Ahmar Noman | IGCSE Physics · Math · Biology |
| Aurneela Ghosh Riddhi | AS Business |
| Syed Muhammad Murtaza | IGCSE Physics · English · Math · Chemistry |
| Harem Mir | Biology (IB, AP, O/A Level, IGCSE) · English · History |
| Syed Arqam | A-Level Biology · IGCSE Math, Chemistry, ICT, Physics, Biology |
| Chirag Kar | A-Level Math |
| Khadija Amatullah | IGCSE Chemistry |
| Menahil Khalid | IGCSE Biology · IGCSE English |
| Rabia Nayyar Butt | IGCSE Biology · IGCSE Chemistry |

## `app/about/page.tsx` — DC Team (`dcTeam` array)

Minimal info only (name, department, current/former) — no bios. Names shown
as first name + last-initial. Atiqa is the only current member; everyone
else is marked "Former."

| Name | Department | Status |
|---|---|---|
| Atiqa F. | Operations | Current |
| Aleena U. | Operations | Former |
| Mahrukh A. | Marketing | Former |
| Alex | Finance | Former |
| Aisyah F. | Marketing | Former |
| Mubashir A. | Marketing | Current |

Verification notes:
- Aisyah F. matches Team sheet "Aisyah Noor Fatihah" (STU012, Marketing,
  Social Media Assistant, Status=Inactive).
- Alex (Finance) has no matching record in the Excel or the live app DB —
  flagged to user, who confirmed keeping it as given.
- Mubashir A. (Marketing) has no matching record in the Excel (Team or
  Recruits sheets) or the live app DB — flagged; user confirmed adding him
  as current per explicit instruction.

## Open / on hold

- TKT-0174 (site-wide framing shift, university-admissions → mentoring
  language) — explicitly skipped/on hold. No direction given yet.
- TKT-0009, TKT-0151, TKT-0187, TKT-0206, TKT-0215 — still open, not yet
  addressed.
