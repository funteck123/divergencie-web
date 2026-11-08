// Books library: textbooks and practice books as PDFs, shown on the study portal. The files and their manifest live on the Question Solver
// service's machine (data/books/, never in git); this file only decides who may see which book and cleans what the service reports.
// Every book carries a Rights note (who allowed it to be shared); the note is for Management and never reaches a student.

import { subjectCodeOfService } from "./recordings";

const ID = /^[a-f0-9]{12}$/;

/** Keep only the fields the library uses. Returns null when the entry cannot be shown (no valid id, title or subject code). */
export function cleanBook(b) {
  const id = String(b?.BookID || "").trim();
  if (!ID.test(id)) return null;
  const title = String(b?.Title || "").trim().slice(0, 160);
  const subjectCode = String(b?.SubjectCode || "").trim();
  if (!title || !/^\d{4}$/.test(subjectCode)) return null;
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  return {
    BookID: id,
    Title: title,
    Authors: String(b?.Authors || "").trim().slice(0, 160),
    Edition: String(b?.Edition || "").trim().slice(0, 40),
    Level: String(b?.Level || "").trim(),
    Subject: String(b?.Subject || "").trim(),
    SubjectCode: subjectCode,
    Kind: String(b?.Kind || "").trim().slice(0, 40),
    Pages: Math.round(num(b?.Pages)),
    SizeMB: Math.round(num(b?.SizeMB) * 10) / 10,
    HasCover: !!b?.HasCover,
    Hidden: !!b?.Hidden,
    Rights: String(b?.Rights || "").trim().slice(0, 300),
  };
}

/** Enrollment live today: started (or no start date) and not ended (or no end date). Same day-level rule as the Question Solver library. */
export function isEnrollmentActiveToday(enrollment, today = new Date().toISOString().slice(0, 10)) {
  if (enrollment?.StartDate && enrollment.StartDate > today) return false;
  if (enrollment?.EndDate && enrollment.EndDate < today) return false;
  return true;
}

/** The four-digit subject codes this person is enrolled in right now. */
export function enrolledSubjectCodes(db, userId, today) {
  const codes = new Set();
  for (const e of db.enrollments || []) {
    if (e.UserID !== userId || !isEnrollmentActiveToday(e, today)) continue;
    const code = subjectCodeOfService((db.services || []).find((s) => s.ServiceID === e.ServiceID));
    if (code) codes.add(code);
  }
  return codes;
}

/**
 * Who sees what.
 *  - Management: every book, including hidden ones, with the Rights note.
 *  - Student: a visible book whose subject code is one of the subjects the student is enrolled in now, without the Rights note.
 *  - Everyone else: nothing.
 */
export function visibleBooks(db, session, books, today) {
  const clean = (books || []).map(cleanBook).filter(Boolean);
  if (session?.userType === "Management") return clean;
  if (session?.userType !== "Student") return [];
  const mine = enrolledSubjectCodes(db, session.userId, today);
  return clean.filter((b) => !b.Hidden && mine.has(b.SubjectCode)).map(({ Rights, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
}

/** True when this person may open this book's file. Same rule as the list, so a guessed id gives nothing. */
export function canOpenBook(db, session, books, bookId, today) {
  return visibleBooks(db, session, books, today).some((b) => b.BookID === bookId);
}
