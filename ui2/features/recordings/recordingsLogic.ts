import type { RecordingRecord } from "@/ui2/queries/recordings";

/** One course the student can watch: a subject, and its component when the subject has several (9709 Pure 1 and 9709 Statistics 1 are two courses). */
export interface CourseOption {
  key: string;
  label: string;
  count: number;
}
export interface ChapterGroup {
  key: string;
  chapterNo: number;
  heading: string;
  rows: RecordingRecord[];
}

export const courseKeyOf = (r: Pick<RecordingRecord, "SubjectCode" | "Component">) => `${r.SubjectCode}|${r.Component ?? ""}`;

/** "A Level Mathematics 9709 · Pure Mathematics 1" */
export const courseLabel = (r: Pick<RecordingRecord, "Level" | "Subject" | "SubjectCode" | "Component">) =>
  `${[r.Level, r.Subject, r.SubjectCode].filter(Boolean).join(" ")}${r.Component ? ` · ${r.Component}` : ""}`;

export function coursesOf(rows: readonly RecordingRecord[]): CourseOption[] {
  const m = new Map<string, CourseOption>();
  for (const r of rows) {
    const k = courseKeyOf(r);
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { key: k, label: courseLabel(r), count: 1 });
  }
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Only the chosen course's recordings, narrowed by the search text. */
export function filterRecordings(rows: readonly RecordingRecord[], opts: { q: string; course: string }): RecordingRecord[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((r) => courseKeyOf(r) === opts.course && (!q || `${r.Title} ${r.ChapterName} ${r.Batch}`.toLowerCase().includes(q)));
}

/** Chapters in syllabus order, lessons inside a chapter in teaching order (by recording date). Call it with one course's rows. */
export function groupByChapter(rows: readonly RecordingRecord[]): ChapterGroup[] {
  const m = new Map<string, ChapterGroup>();
  for (const r of rows) {
    const key = `${r.ChapterNo}|${r.ChapterName}`;
    const g = m.get(key) ?? { key, chapterNo: r.ChapterNo, heading: `${r.ChapterNo > 0 ? `Chapter ${r.ChapterNo} · ` : ""}${r.ChapterName || "Other recordings"}`, rows: [] };
    g.rows.push(r);
    m.set(key, g);
  }
  const groups = [...m.values()].sort((a, b) => (a.chapterNo || 999) - (b.chapterNo || 999) || a.heading.localeCompare(b.heading));
  for (const g of groups) g.rows.sort((a, b) => a.Date.localeCompare(b.Date) || a.Title.localeCompare(b.Title));
  return groups;
}

/** The lesson before and after the current one, walking through the chapters in order. */
export function neighbours(groups: readonly ChapterGroup[], id: string | undefined): { prev?: RecordingRecord; next?: RecordingRecord; index: number; total: number } {
  const flat = groups.flatMap((g) => g.rows);
  const i = flat.findIndex((r) => r.RecordingID === id);
  return { prev: i > 0 ? flat[i - 1] : undefined, next: i >= 0 ? flat[i + 1] : undefined, index: i, total: flat.length };
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
