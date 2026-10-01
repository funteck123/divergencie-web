// Import an account from pasted text (TKT-0319). Pure functions, no I/O, safe in the browser.
//
// Two readers, both regex based, both tolerant of tabs, ":" or runs of spaces between a label and
// its value, and of values that continue on the next lines (the "Subjects" list):
//   - parseFormEntry: the Cognito Forms student intake entry ("Entry Details / Student Name ...").
//   - parseLabelled: simple "Label: value" lines for every other account type.
// Then findMatches() finds existing accounts for the entry and buildFillPatch() builds an update
// that only fills blank fields (it never overwrites what is already stored).

// ---- label tables -------------------------------------------------------------------------

// Order matters: the first matching label wins ("Parent's Email" must be tried before "Email").
const FORM_LABELS = [
  ["parentEmail", "parent(?:'s|s)?\\s+e-?mail(?:\\s+address)?"],
  ["parentNumber", "parent(?:'s|s)?(?:\\s+contact|\\s+whats\\s?app)?(?:\\s+number|\\s+no\\.?)?(?:\\s*\\([^)]*\\))?"],
  ["name", "student(?:'s|s)?\\s+name|full\\s+name|name"],
  ["gender", "gender"],
  ["location", "location|country"],
  ["whatsapp", "whats\\s?app(?:\\s+number)?(?:\\s*\\([^)]*\\))?"],
  ["email", "(?:your\\s+|student(?:'s)?\\s+)?e-?mail(?:\\s+address)?"],
  ["studying", "what\\s+are\\s+you\\s+studying\\??|studying|level|course"],
  ["help", "how\\s+shall\\s+we\\s+help\\??"],
  ["subjects", "subjects?"],
  ["referrer", "who\\s+referred\\s+you\\??(?:\\s*\\([^)]*\\))?|referrer(?:\\s+name)?"],
  ["heardAbout", "how\\s+did\\s+you\\s+hear\\s+about\\s+us\\??"],
  ["scoreAStar", "do\\s+you\\s+feel\\s+you\\s+can\\s+score\\s+a\\*.*?\\?"],
  ["school", "school(?:\\s+name)?"],
  ["coupon", "coupon(?:\\s+code)?"],
];

const LABELLED_LABELS = [
  ["name", "name|full\\s+name"],
  ["email", "e-?mail(?:\\s+address)?"],
  ["whatsapp", "whats\\s?app(?:\\s+number)?|phone(?:\\s+number)?|mobile"],
  ["passport", "passport(?:\\s*/\\s*ic)?(?:\\s+number)?|ic(?:\\s+number)?"],
  ["role", "role|job\\s+title"],
  ["department", "department"],
  ["batch", "batch"],
  ["course", "course|level"],
  ["timezone", "time\\s?zone"],
  ["currency", "currency"],
  ["notes", "notes?"],
];

// "Label<tab>value", "Label: value", "Label    value" or "Label value".
const SEPARATOR = "(?:\\s*[:\\t]\\s*|\\s{2,}|\\s+)";

// Any label may be followed by a note in brackets, such as "(Optional)" or "(Include country code!)".
const NOTE = "(?:\\s*\\([^)]*\\))?";
function compile(table) {
  return table.map(([key, source]) => [key, new RegExp(`^\\s*(?:${source})${NOTE}${SEPARATOR}(.*)$`, "i"), new RegExp(`^\\s*(?:${source})${NOTE}\\s*[:\\t]?\\s*$`, "i")]);
}
const FORM_RES = compile(FORM_LABELS);
const LABELLED_RES = compile(LABELLED_LABELS);

function readLines(text, table) {
  const values = {};
  const order = [];
  let current = null;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/ /g, " ").trimEnd();
    if (!line.trim()) continue;
    let hit = null;
    for (const [key, withValue, labelOnly] of table) {
      const m = line.match(withValue);
      if (m) { hit = [key, (m[1] || "").trim()]; break; }
      if (labelOnly.test(line)) { hit = [key, ""]; break; }
    }
    if (hit) {
      const [key, value] = hit;
      current = key;
      if (!(key in values)) order.push(key);
      values[key] = values[key] ? [...values[key], ...(value ? [value] : [])] : value ? [value] : [];
    } else if (current) {
      // A line with no label continues the previous answer (a multi-select such as Subjects).
      values[current].push(line.trim());
    }
  }
  return { values, order };
}

// ---- normalising --------------------------------------------------------------------------

const join = (list) => (list || []).map((v) => v.trim()).filter(Boolean).join(", ");
const one = (list) => (list && list[0] ? list[0].trim() : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digitsOf = (value) => String(value || "").replace(/\D/g, "");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

// Where the student lives sets a sensible default timezone and currency for a NEW account.
const LOCATION_DEFAULTS = [
  [/^india$|^bharat$/i, "Asia/Kolkata", "INR"],
  [/saudi|^ksa$/i, "Asia/Riyadh", "SAR"],
  [/^uk$|united kingdom|england|scotland|wales/i, "Europe/London", "GBP"],
  [/malaysia/i, "Asia/Kuala_Lumpur", "MYR"],
  [/pakistan/i, "Asia/Karachi", "PKR"],
  [/^uae$|emirates|dubai|abu dhabi|sharjah/i, "Asia/Dubai", "AED"],
  [/^usa$|^us$|united states|america/i, "America/New_York", "USD"],
  [/new zealand/i, "Pacific/Auckland", "NZD"],
  [/qatar/i, "Asia/Qatar", "QAR"],
  [/kuwait/i, "Asia/Kuwait", "KWD"],
  [/bahrain/i, "Asia/Bahrain", "BHD"],
  [/oman/i, "Asia/Muscat", "OMR"],
  [/bangladesh/i, "Asia/Dhaka", "BDT"],
  [/sri lanka/i, "Asia/Colombo", "LKR"],
  [/nepal/i, "Asia/Kathmandu", "NPR"],
  [/singapore/i, "Asia/Singapore", "SGD"],
  [/canada/i, "America/Toronto", "CAD"],
  [/australia/i, "Australia/Sydney", "AUD"],
];
export function defaultsForLocation(location) {
  const text = String(location || "").trim();
  for (const [re, timezone, currency] of LOCATION_DEFAULTS) if (re.test(text)) return { timezone, currency };
  return { timezone: "", currency: "" };
}

// Gender, help wanted, subjects, referrer, how they heard and the A* answer are real Student
// fields. Only a coupon code (no field of its own) is kept as a line in Notes.
function intakeNotes(f, today) {
  const lines = [];
  if (f.coupon) lines.push(`Coupon: ${f.coupon}`);
  return { header: `Intake form (imported ${today})`, lines };
}

// ---- readers ------------------------------------------------------------------------------

export function parseFormEntry(text, today = new Date().toISOString().slice(0, 10)) {
  const { values, order } = readLines(text, FORM_RES);
  const f = {
    name: one(values.name).replace(/\s+/g, " "),
    gender: cap(one(values.gender)),
    location: one(values.location),
    whatsapp: one(values.whatsapp),
    email: one(values.email).toLowerCase(),
    parentWhatsapp: one(values.parentNumber),
    parentEmail: one(values.parentEmail).toLowerCase(),
    course: one(values.studying),
    help: join(values.help),
    subjects: join(values.subjects),
    referrer: one(values.referrer),
    heardAbout: join(values.heardAbout),
    scoreAStar: one(values.scoreAStar),
    school: one(values.school),
    coupon: one(values.coupon),
  };
  const warnings = [];
  if (!f.name) warnings.push("No student name found.");
  if (f.email && !EMAIL_RE.test(f.email)) warnings.push(`Email "${f.email}" does not look valid.`);
  if (f.parentEmail && !EMAIL_RE.test(f.parentEmail)) warnings.push(`Parent email "${f.parentEmail}" does not look valid.`);
  for (const key of ["whatsapp", "parentWhatsapp"]) {
    if (f[key] && digitsOf(f[key]).length < 8) warnings.push(`${key === "whatsapp" ? "WhatsApp" : "Parent"} number "${f[key]}" looks too short.`);
  }
  return {
    kind: "form",
    userType: "Student",
    ok: Boolean(f.name),
    fields: f,
    ...defaultsForLocation(f.location),
    notes: intakeNotes(f, today),
    found: order,
    warnings,
  };
}

export function parseLabelled(text, userType) {
  const { values, order } = readLines(text, LABELLED_RES);
  const f = {
    name: one(values.name).replace(/\s+/g, " "),
    email: one(values.email).toLowerCase(),
    whatsapp: one(values.whatsapp),
    passport: one(values.passport),
    role: one(values.role),
    department: one(values.department),
    batch: one(values.batch),
    course: one(values.course),
    timezone: one(values.timezone),
    currency: one(values.currency).toUpperCase(),
    notes: join(values.notes),
  };
  const warnings = [];
  if (!f.name) warnings.push("No name found. Start with a line such as \"Name: Full Name\".");
  if (f.email && !EMAIL_RE.test(f.email)) warnings.push(`Email "${f.email}" does not look valid.`);
  if (userType === "Parent") warnings.push("A Parent account needs linked students. Create it with the form below.");
  return { kind: "labelled", userType, ok: Boolean(f.name) && userType !== "Parent", fields: f, timezone: f.timezone, currency: f.currency, notes: null, found: order, warnings };
}

// A Cognito student entry is recognised by its own labels, whatever account type is selected.
export function looksLikeStudentForm(text) {
  return /^\s*student(?:'s)?\s+name\b/im.test(text) || /what\s+are\s+you\s+studying/i.test(text);
}

export function parseImport(text, userType, today) {
  return userType === "Student" || looksLikeStudentForm(text) ? parseFormEntry(text, today) : parseLabelled(text, userType);
}

// ---- matching -----------------------------------------------------------------------------

const normName = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const sameNumber = (a, b) => {
  const x = digitsOf(a);
  const y = digitsOf(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-9) === y.slice(-9);
};

// "Varang" and "Varang Sharma": every word of the shorter name is a word of the longer one.
function similarName(a, b) {
  const x = normName(a).split(" ").filter(Boolean);
  const y = normName(b).split(" ").filter(Boolean);
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.join("").length >= 4 && short.every((w) => long.includes(w));
}

// Existing accounts of the same type that look like the same person, strongest first.
export function findMatches(users, parsed) {
  const f = parsed.fields;
  const out = [];
  for (const u of users || []) {
    if (u.UserType !== parsed.userType) continue;
    const reasons = [];
    if (f.whatsapp && sameNumber(u.WhatsAppNumber, f.whatsapp)) reasons.push("WhatsApp number");
    if (f.email && u.Email && String(u.Email).toLowerCase() === f.email) reasons.push("email");
    if (f.name && normName(u.Name) === normName(f.name)) reasons.push("name");
    else if (f.name && similarName(u.Name, f.name)) reasons.push("similar name");
    if (f.parentWhatsapp && sameNumber(u.ParentWhatsAppNumber, f.parentWhatsapp)) reasons.push("parent number");
    if (!reasons.length) continue;
    const score = (reasons.includes("WhatsApp number") ? 3 : 0) + (reasons.includes("email") ? 3 : 0) + (reasons.includes("name") ? 2 : 0) + (reasons.includes("parent number") ? 2 : 0) + (reasons.includes("similar name") ? 1 : 0);
    out.push({ user: u, reasons, score });
  }
  return out.sort((a, b) => b.score - a.score || String(a.user.UserID).localeCompare(String(b.user.UserID)));
}

// An account whose full name equals the referrer text, only when exactly one does (a first name
// alone, or a name shared by two people, stays plain text).
export function findReferrer(users, name) {
  const wanted = normName(name);
  if (!wanted) return null;
  const hits = (users || []).filter((u) => normName(u.Name) === wanted);
  return hits.length === 1 ? { userId: hits[0].UserID, name: hits[0].Name, userType: hits[0].UserType } : null;
}

// ---- building requests --------------------------------------------------------------------

const notesText = (n) => (n && n.lines.length ? [n.header, ...n.lines].join("\n") : "");

// Body for POST /api/users. `extra` lets the form's own timezone and currency win when the entry has none.
export function buildCreateBody(parsed, extra = {}) {
  const f = parsed.fields;
  const body = { userType: parsed.userType, name: f.name };
  const currency = parsed.currency || extra.currency;
  const timezone = parsed.timezone || extra.timezone;
  if (currency) body.currency = currency;
  if (parsed.kind === "form") {
    if (timezone) body.timezone = timezone;
    body.course = f.course;
    if (f.whatsapp) body.whatsappNumber = f.whatsapp;
    if (f.email) body.email = f.email;
    if (f.parentWhatsapp) body.parentWhatsappNumber = f.parentWhatsapp;
    if (f.parentEmail) body.parentEmail = f.parentEmail;
    if (f.school) body.school = f.school;
    if (f.location) body.location = f.location;
    if (f.gender) body.gender = f.gender;
    if (f.help) body.helpWanted = f.help;
    if (f.subjects) body.subjects = f.subjects;
    if (f.heardAbout) body.heardAbout = f.heardAbout;
    if (f.scoreAStar) body.scoreAStar = f.scoreAStar;
    if (f.referrer) {
      body.referrerName = f.referrer;
      if (extra.referrer) body.referrerUserId = extra.referrer.userId;
    }
    const notes = notesText(parsed.notes);
    if (notes) body.notes = notes;
    return body;
  }
  if (["Teacher", "Staff", "Ambassador"].includes(parsed.userType)) {
    if (f.role) body.role = f.role;
    if (f.passport) body.passportNumber = f.passport;
    if (f.whatsapp) body.whatsappNumber = f.whatsapp;
    if (f.email) body.email = f.email;
  }
  if (["Teacher", "Staff", "Ambassador", "Student"].includes(parsed.userType) && timezone) body.timezone = timezone;
  if (parsed.userType === "Staff" && f.department) body.department = f.department;
  if (["Teacher", "Student"].includes(parsed.userType) && f.batch) body.batch = f.batch;
  return body;
}

// What each imported field is called on an existing record, and on PATCH /api/users.
const FILL_FIELDS = {
  Student: [
    ["email", "Email", "email", "Email"],
    ["whatsapp", "WhatsAppNumber", "whatsappNumber", "WhatsApp number"],
    ["parentWhatsapp", "ParentWhatsAppNumber", "parentWhatsappNumber", "Parent WhatsApp number"],
    ["parentEmail", "ParentEmail", "parentEmail", "Parent email"],
    ["school", "School", "school", "School"],
    ["location", "Location", "location", "Location"],
    ["course", "Course", "course", "Course"],
    ["gender", "Gender", "gender", "Gender"],
    ["help", "HelpWanted", "helpWanted", "Help wanted"],
    ["subjects", "Subjects", "subjects", "Subjects"],
    ["heardAbout", "HeardAbout", "heardAbout", "Heard about us"],
    ["scoreAStar", "ScoreAStar", "scoreAStar", "Can score A*"],
  ],
  roleEligible: [
    ["email", "Email", "email", "Email"],
    ["whatsapp", "WhatsAppNumber", "whatsappNumber", "WhatsApp number"],
    ["passport", "PassportNumber", "passportNumber", "Passport / IC number"],
    ["role", "Role", "role", "Role"],
  ],
};

// An update for an existing account: blanks are filled, text already there is kept, and the intake
// answers are appended to Notes once. `changes` is what will be written, `kept` is what differs but
// was left alone, so the user sees both before confirming.
export function buildFillPatch(user, parsed, extra = {}) {
  const f = parsed.fields;
  const table = parsed.userType === "Student" ? FILL_FIELDS.Student : ["Teacher", "Staff", "Ambassador"].includes(parsed.userType) ? FILL_FIELDS.roleEligible : [];
  const moreFields = [];
  if (parsed.kind === "labelled") {
    if (user.UserType === "Staff") moreFields.push(["department", "Department", "department", "Department"]);
    if (user.UserType === "Teacher") moreFields.push(["batch", "Batch", "batch", "Batch"]);
    if (user.UserType === "Student") moreFields.push(["batch", "Batch", "batch", "Batch"]);
  }
  const patch = { userId: user.UserID };
  const changes = [];
  const kept = [];
  for (const [key, recordKey, apiKey, label] of [...table, ...moreFields]) {
    const incoming = f[key];
    if (!incoming) continue;
    const existing = user[recordKey];
    if (!existing) {
      patch[apiKey] = incoming;
      changes.push({ label, from: "", to: incoming });
    } else if (key === "whatsapp" || key === "parentWhatsapp" ? !sameNumber(existing, incoming) : String(existing).trim().toLowerCase() !== String(incoming).trim().toLowerCase()) {
      kept.push({ label, existing: String(existing), imported: incoming });
    }
  }
  // Referrer: free text, plus a link when one account has exactly that name.
  if (parsed.userType === "Student" && f.referrer) {
    if (!user.ReferrerName && !user.ReferrerUserID) {
      patch.referrerName = f.referrer;
      if (extra.referrer) patch.referrerUserId = extra.referrer.userId;
      changes.push({ label: "Referrer", from: "", to: extra.referrer ? `${f.referrer} (linked to ${extra.referrer.userId})` : f.referrer });
    } else if (String(user.ReferrerName || "").trim().toLowerCase() !== f.referrer.trim().toLowerCase()) {
      kept.push({ label: "Referrer", existing: String(user.ReferrerName || user.ReferrerUserID), imported: f.referrer });
    }
  }
  // The coupon line goes to Notes once: skipped if every line is already there.
  // Notes exist on Student records only.
  const noteLines = user.UserType !== "Student" ? [] : parsed.notes ? parsed.notes.lines : f.notes ? [f.notes] : [];
  if (noteLines.length) {
    const existingNotes = String(user.Notes || "");
    const fresh = noteLines.filter((line) => !existingNotes.includes(line));
    if (fresh.length) {
      const block = parsed.notes ? [parsed.notes.header, ...fresh].join("\n") : fresh.join("\n");
      patch.notes = existingNotes ? `${existingNotes}\n\n${block}` : block;
      changes.push({ label: "Notes", from: existingNotes ? "(kept, new lines added)" : "", to: block });
    }
  }
  return { patch, changes, kept, nothingToDo: changes.length === 0 };
}
