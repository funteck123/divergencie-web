// Recording Library (TKT-0358): class recordings uploaded to YouTube as UNLISTED videos and played inside the portal.
// One record per video, keyed by its YouTube id. Unlisted ids must not leak: this file only decides who may see which record.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Keep only the fields the library uses. Returns null when the record cannot be played (no valid YouTube id, title or subject code). */
export function cleanRecording(r) {
  const id = String(r?.YouTubeId || r?.RecordingID || "").trim();
  if (!YT_ID.test(id)) return null;
  const title = String(r?.Title || "").trim().slice(0, 140);
  const subjectCode = String(r?.SubjectCode || "").trim();
  if (!title || !subjectCode) return null;
  const date = String(r?.Date || "").trim();
  return {
    RecordingID: id,
    YouTubeId: id,
    Title: title,
    Level: String(r?.Level || "").trim(),
    Subject: String(r?.Subject || "").trim(),
    SubjectCode: subjectCode,
    Component: String(r?.Component || "").trim(),
    ChapterNo: Number.isFinite(Number(r?.ChapterNo)) ? Number(r.ChapterNo) : 0,
    ChapterName: String(r?.ChapterName || "").trim(),
    Date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    Batch: String(r?.Batch || "").trim(),
    DurationMin: Number.isFinite(Number(r?.DurationMin)) ? Math.round(Number(r.DurationMin) * 10) / 10 : 0,
    Hidden: !!r?.Hidden,
  };
}

/** "9702" from a Service: its own SubjectCode, else the first four-digit number in its name ("Cambridge A-Level 9702 Physics"). */
export function subjectCodeOfService(service) {
  return String(service?.SubjectCode || "").trim() || (String(service?.Name || "").match(/\b(\d{4})\b/) || [])[1] || "";
}

/** "pure 1" from "Pure Mathematics 1" or "Pure 1", "statistics 1" from "Probability and Statistics 1" or "Statistics 1". Empty when the text names no component. */
export function componentKey(text) {
  const m = String(text || "").toLowerCase().match(/\b(pure|mechanics|statistics)(?:\s+mathematics)?\s*(\d)\b/);
  return m ? `${m[1]} ${m[2]}` : "";
}

function batchNameOf(service, batchId) {
  const batches = (service?.OptionalComponents || []).flatMap((c) => c.Batches || []);
  const b = batchId ? batches.find((x) => x.BatchID === batchId) : batches[0];
  return String(b?.BatchName || "").trim().toLowerCase();
}

/**
 * Who sees what.
 *  - Management: everything, including hidden records.
 *  - Student: a visible record whose subject code matches a subject the student is enrolled in, and, when the recording
 *    names a batch (for example "B8"), only if the student's own batch for that subject has the same name.
 *    A recording with no batch is open to every student of the subject.
 *  - When the recording names a component (Pure Mathematics 1) and the student's course names one (Pure 1), the two must match.
 *  - Everyone else: nothing.
 */
export function visibleRecordings(db, session) {
  const all = db.recordings || [];
  if (session?.userType === "Management") return all;
  if (session?.userType !== "Student") return [];
  const mine = (db.enrollments || [])
    .filter((e) => e.UserID === session.userId)
    .map((e) => {
      const service = (db.services || []).find((s) => s.ServiceID === e.ServiceID);
      return { code: subjectCodeOfService(service), batch: batchNameOf(service, e.BatchID), component: componentKey(service?.Name) };
    })
    .filter((m) => m.code);
  return all.filter(
    (r) =>
      !r.Hidden &&
      mine.some(
        (m) =>
          m.code === r.SubjectCode &&
          (!r.Batch || r.Batch.toLowerCase() === m.batch) &&
          // A recording of one component (Pure 1) is for students of that component; a student whose course names no component sees them all.
          (!m.component || !componentKey(r.Component) || m.component === componentKey(r.Component))
      )
  );
}
