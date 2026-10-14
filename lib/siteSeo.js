// TKT-0285: one place for the public site's address and the pages that belong in the sitemap.
export const SITE_URL = "https://www.divergencie.co.uk";

export const SERVICE_SLUGS = {
  igcse: { name: "IGCSE Coaching", description: "Grades 9 to 11 preparation for Cambridge IGCSE: structured live sessions, past paper drills and A* strategy for every major subject group." },
  "a-level": { name: "A Level Coaching", description: "AS and A2 preparation for Cambridge A Levels with university-targeted coaching from teachers, examiners and past country and world toppers." },
  ap: { name: "AP Exam Coaching", description: "Preparation for College Board AP exams with personalised coaching for US college credit and admissions." },
  ib: { name: "IB Diploma Support", description: "HL and SL support for the International Baccalaureate, including TOK, IA and Extended Essay guidance." },
  sat: { name: "SAT & ACT Prep", description: "Strategic preparation for US college entrance exams: personalised drills, timing strategies and score-boosting techniques." },
  ielts: { name: "IELTS & TOEFL Prep", description: "Intensive coaching for English proficiency tests, with speaking mocks and detailed writing feedback." },
};

/** Public, indexable pages: path, how often it changes, and its weight in the sitemap. */
export const SITE_PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  ...Object.keys(SERVICE_SLUGS).map((slug) => ({ path: `/services/${slug}`, changeFrequency: "monthly", priority: 0.8 })),
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/admissions", changeFrequency: "monthly", priority: 0.9 },
  { path: "/resources", changeFrequency: "monthly", priority: 0.6 },
  { path: "/careers", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
];

/** Paths search engines must not crawl: the portal, the API and the login pages. */
export const ROBOTS_DISALLOW = ["/api/", "/dashboard/", "/v2/", "/app/", "/app$", "/login", "/mock"];
