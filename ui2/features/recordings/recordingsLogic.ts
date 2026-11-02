import type { RecordingRecord } from "@/ui2/queries/recordings";

export interface SubjectOption {
  code: string;
  label: string;
  count: number;
}
export interface ChapterGroup {
  key: string;
  /** "Mathematics 9709": the subject this chapter belongs to. */
  subject: string;
  chapterNo: number;
  heading: string;
  rows: RecordingRecord[];
}

/** "Physics 9702": level words are dropped, the code stays so two levels of one subject stay apart. */
export const subjectLabel = (r: Pick<RecordingRecord, "Subject" | "SubjectCode">) => `${r.Subject || "Subject"} ${r.SubjectCode}`.trim();

export function subjectsOf(rows: readonly RecordingRecord[]): SubjectOption[] {
  const m = new Map<string, SubjectOption>();
  for (const r of rows) {
    const cur = m.get(r.SubjectCode);
    if (cur) cur.count++;
    else m.set(r.SubjectCode, { code: r.SubjectCode, label: subjectLabel(r), count: 1 });
  }
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function filterRecordings(rows: readonly RecordingRecord[], opts: { q: string; subject: string }): RecordingRecord[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((r) => (!opts.subject || r.SubjectCode === opts.subject) && (!q || `${r.Title} ${r.ChapterName} ${r.Subject} ${r.Batch}`.toLowerCase().includes(q)));
}

/** Chapter order first (the syllabus order), then recording date inside a chapter (teaching order: Quadratics 3, 4, 5). Subjects stay apart. */
export function groupByChapter(rows: readonly RecordingRecord[]): ChapterGroup[] {
  const m = new Map<string, ChapterGroup>();
  for (const r of rows) {
    const key = `${r.SubjectCode}|${r.ChapterNo}|${r.ChapterName}`;
    const heading = `${r.ChapterNo > 0 ? `Chapter ${r.ChapterNo} · ` : ""}${r.ChapterName || "Other recordings"}`;
    const g = m.get(key) ?? { key, subject: subjectLabel(r), chapterNo: r.ChapterNo, heading, rows: [] };
    g.rows.push(r);
    m.set(key, g);
  }
  const groups = [...m.values()].sort((a, b) => a.subject.localeCompare(b.subject) || (a.chapterNo || 999) - (b.chapterNo || 999) || a.heading.localeCompare(b.heading));
  for (const g of groups) g.rows.sort((a, b) => a.Date.localeCompare(b.Date) || a.Title.localeCompare(b.Title));
  return groups;
}

export function durationLabel(min: number): string {
  if (!(min > 0)) return "";
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** The embed address: the privacy-friendly YouTube host, no related videos from other channels. */
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
