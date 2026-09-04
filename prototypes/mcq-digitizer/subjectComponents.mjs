// Real Cambridge assessment component structure, per subject -- hand-
// verified against the actual syllabus PDFs in prototypes/syllabus-library/
// pdfs/ (PyMuPDF text extraction of each subject's real "Assessment
// overview" / "Details of the assessment" section), never guessed from
// general knowledge. Full research notes and citations live in
// planning/mcq-digitizer-integration-plan.md.
//
// This is the terminology change from "Category" to "Component" requested
// directly: what used to be a single flat "MCQ" bucket per subject is now
// that subject's REAL, complete list of exam components (Paper 1, Paper 2,
// ...), most of which start as empty buckets today -- per explicit user
// direction, an empty component is the correct default to show, not
// something to hide, since real topic-wise content will be added per
// component over time.
//
// `mcqComponent` names which one of a subject's real components the
// existing Drive "MCQ" crawl folder's content actually belongs to, for the
// handful of subjects with real digitized content today. Confirmed real
// and NOT a uniform rule across subjects -- IGCSE sciences' existing MCQ
// content is Extended-tier (Paper 2), but A-Level sciences' is AS-tier
// (Paper 1, since A-Level uses AS/A2 staging, not Core/Extended). A
// subject with no `mcqComponent` either has no real MCQ paper in its own
// syllabus at all (confirmed for ESL, ICT, First Language English,
// Business Studies, Computer Science, and every A-Level subject except
// Physics/Chemistry/Biology/Economics), or hasn't been crawled yet.
export const SUBJECT_COMPONENTS = {
  "IGCSE|Physics": {
    mcqComponent: "Paper 2: Multiple Choice (Extended)",
    components: [
      "Paper 1: Multiple Choice (Core)",
      "Paper 2: Multiple Choice (Extended)",
      "Paper 3: Theory (Core)",
      "Paper 4: Theory (Extended)",
      "Paper 5: Practical Test",
      "Paper 6: Alternative to Practical",
    ],
  },
  "IGCSE|Chemistry": {
    mcqComponent: "Paper 2: Multiple Choice (Extended)",
    components: [
      "Paper 1: Multiple Choice (Core)",
      "Paper 2: Multiple Choice (Extended)",
      "Paper 3: Theory (Core)",
      "Paper 4: Theory (Extended)",
      "Paper 5: Practical Test",
      "Paper 6: Alternative to Practical",
    ],
  },
  "IGCSE|Biology": {
    mcqComponent: "Paper 2: Multiple Choice (Extended)",
    components: [
      "Paper 1: Multiple Choice (Core)",
      "Paper 2: Multiple Choice (Extended)",
      "Paper 3: Theory (Core)",
      "Paper 4: Theory (Extended)",
      "Paper 5: Practical Test",
      "Paper 6: Alternative to Practical",
    ],
  },
  "IGCSE|Mathematics": {
    // No real MCQ component exists for this subject at all -- confirmed
    // from the actual syllabus. All four components start empty.
    components: [
      "Paper 1: Non-calculator (Core)",
      "Paper 2: Non-calculator (Extended)",
      "Paper 3: Calculator (Core)",
      "Paper 4: Calculator (Extended)",
    ],
  },
  "IGCSE|English as a Second Language": {
    components: [
      "Paper 1: Reading and Writing",
      "Paper 2: Listening",
      "Paper 3: Speaking",
    ],
  },
  "IGCSE|First Language English": {
    components: [
      "Paper 1: Reading",
      "Paper 2: Directed Writing and Composition",
      "Component 3: Coursework Portfolio",
      "Component 4: Speaking and Listening",
    ],
  },
  "IGCSE|ICT": {
    components: [
      "Paper 1: Theory",
      "Paper 2: Document Production, Databases and Presentations",
      "Component 3: Spreadsheets and Website Authoring",
    ],
  },
  "IGCSE|Economics": {
    // Real exception to the "sciences' MCQ = Paper 2" pattern -- this
    // subject's own MCQ paper is Paper 1, confirmed from the actual
    // syllabus. No existing crawled content to remap yet either way.
    mcqComponent: "Paper 1: Multiple Choice",
    components: [
      "Paper 1: Multiple Choice",
      "Paper 2: Structured Questions",
    ],
  },
  "IGCSE|Business Studies": {
    components: [
      "Paper 1: Short Answer and Data Response",
      "Paper 2: Case Study",
    ],
  },
  "IGCSE|Computer Science": {
    components: [
      "Paper 1: Computer Systems",
      "Paper 2: Algorithms, Programming and Logic",
    ],
  },
  "A Levels|Physics": {
    // A-Level uses AS/A2 staging, not Core/Extended -- its MCQ paper is
    // Paper 1 (AS-level), unlike the IGCSE sciences' Paper 2.
    mcqComponent: "Paper 1: Multiple Choice (AS Level)",
    components: [
      "Paper 1: Multiple Choice (AS Level)",
      "Paper 2: AS Level Structured Questions",
      "Paper 3: Advanced Practical Skills (A Level)",
      "Paper 4: A Level Structured Questions (A Level)",
      "Paper 5: Planning, Analysis and Evaluation (A Level)",
    ],
  },
  "A Levels|Chemistry": {
    mcqComponent: "Paper 1: Multiple Choice (AS Level)",
    components: [
      "Paper 1: Multiple Choice (AS Level)",
      "Paper 2: AS Level Structured Questions",
      "Paper 3: Advanced Practical Skills (A Level)",
      "Paper 4: A Level Structured Questions (A Level)",
      "Paper 5: Planning, Analysis and Evaluation (A Level)",
    ],
  },
  "A Levels|Biology": {
    mcqComponent: "Paper 1: Multiple Choice (AS Level)",
    components: [
      "Paper 1: Multiple Choice (AS Level)",
      "Paper 2: AS Level Structured Questions",
      "Paper 3: Advanced Practical Skills (A Level)",
      "Paper 4: A Level Structured Questions (A Level)",
      "Paper 5: Planning, Analysis and Evaluation (A Level)",
    ],
  },
  "A Levels|Information Technology": {
    components: [
      "Paper 1: Theory (AS Level)",
      "Paper 2: Practical (AS Level)",
      "Paper 3: Advanced Theory (A Level)",
      "Paper 4: Advanced Practical (A Level)",
    ],
  },
  "A Levels|Mathematics": {
    // No MCQ component anywhere in this subject -- confirmed from the
    // actual syllabus (full 6-paper structure, read to completion).
    components: [
      "Paper 1: Pure Mathematics 1",
      "Paper 2: Pure Mathematics 2",
      "Paper 3: Pure Mathematics 3",
      "Paper 4: Mechanics",
      "Paper 5: Probability & Statistics 1",
      "Paper 6: Probability & Statistics 2",
    ],
  },
  "A Levels|Computer Science": {
    components: [
      "Paper 1: Theory Fundamentals (AS Level)",
      "Paper 2: Fundamental Problem-solving and Programming Skills (AS Level)",
      "Paper 3: Advanced Theory (A Level)",
      "Paper 4: Practical Programming (A Level)",
    ],
  },
  "A Levels|English General Paper": {
    // AS Level only -- no full A Level tier exists for this subject at
    // all, confirmed from the actual syllabus.
    components: [
      "Component 1: Essay",
      "Component 2: Comprehension",
    ],
  },
  "A Levels|Economics": {
    // Real exception: TWO separate MCQ papers, one per stage -- unlike
    // the sciences, which have exactly one.
    mcqComponent: "Paper 1: Multiple Choice (AS Level)",
    components: [
      "Paper 1: Multiple Choice (AS Level)",
      "Paper 2: Data Response and Essays (AS Level)",
      "Paper 3: Multiple Choice (A Level)",
      "Paper 4: Data Response and Essays (A Level)",
    ],
  },
  "A Levels|Business": {
    components: [
      "Paper 1: Business Concepts 1 (AS Level)",
      "Paper 2: Business Concepts 2 (AS Level)",
      "Paper 3: Business Decision-Making (A Level)",
      "Paper 4: Business Strategy (A Level)",
    ],
  },
  "A Levels|Literature in English": {
    components: [
      "Paper 1: Drama and Poetry (AS Level)",
      "Paper 2: Prose and Unseen (AS Level)",
      "Paper 3: Shakespeare and Drama (A Level)",
      "Paper 4: Pre- and Post-1900 Poetry and Prose (A Level)",
    ],
  },
};
