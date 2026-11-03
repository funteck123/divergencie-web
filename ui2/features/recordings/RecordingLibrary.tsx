"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Skeleton } from "@/ui2/components/Skeleton";
import { useRecordings, type RecordingRecord } from "@/ui2/queries/recordings";
import { coursesOf, durationLabel, embedUrl, filterRecordings, groupByChapter, neighbours } from "./recordingsLogic";
import "@/ui2/features/accounts/accounts.css";
import "./recordings.css";

/**
 * Class recordings (TKT-0358), laid out like a course: pick ONE course, then one chapter at a time, then a lesson.
 * A course is a subject, or a subject's component (9709 Pure Mathematics 1 and 9709 Probability and Statistics 1 are two courses).
 * The server already limits the list to this person's own subjects.
 */
export function RecordingLibrary() {
  const { data, isPending, error, refetch } = useRecordings();
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [courseParam, setCourse] = useQueryState("course", parseAsString.withDefault(""));
  const [picked, setPicked] = useQueryState("v", parseAsString.withDefault(""));
  /** undefined: the chapter of the playing lesson is open. "": every chapter closed. Otherwise the chapter the student opened. */
  const [openParam, setOpenParam] = useState<string | undefined>(undefined);
  const deferredQ = useDeferredValue(q);

  const all = useMemo(() => data ?? [], [data]);
  const courses = useMemo(() => coursesOf(all), [all]);
  const course = courses.find((c) => c.key === courseParam)?.key ?? courses[0]?.key ?? "";
  const rows = useMemo(() => filterRecordings(all, { q: deferredQ, course }), [all, deferredQ, course]);
  const groups = useMemo(() => groupByChapter(rows), [rows]);
  const current: RecordingRecord | undefined = rows.find((r) => r.RecordingID === picked) ?? groups[0]?.rows[0];
  const near = neighbours(groups, current?.RecordingID);
  const currentGroup = groups.find((g) => g.rows.some((r) => r.RecordingID === current?.RecordingID));
  const searching = deferredQ.trim() !== "";
  const openKey = openParam ?? currentGroup?.key ?? "";
  const courseTotal = courses.find((c) => c.key === course)?.count ?? 0;

  const play = (r: RecordingRecord) => {
    setOpenParam(undefined);
    void setPicked(r.RecordingID);
  };

  if (error) {
    return (
      <div role="alert" className="u2-errorbox">
        Could not load the recordings: {error.message}{" "}
        <Button size="sm" variant="ghost" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }
  if (isPending) return <Skeleton height={360} label="Loading recordings" />;
  if (all.length === 0) {
    return (
      <div className="u2-box u2-rec__empty">
        <strong className="u2-strong">No recordings yet</strong>
        <p className="u2-muted">Recordings of your classes appear here once they are checked and uploaded. Check again in a few days.</p>
      </div>
    );
  }

  return (
    <div className="u2-rec">
      <div className="u2-rec__top">
        {courses.length > 1 ? (
          <div className="u2-seg" role="group" aria-label="Course">
            {courses.map((c) => (
              <button key={c.key} type="button" className="u2-seg__btn" aria-pressed={course === c.key} data-on={course === c.key} onClick={() => { void setCourse(c.key); void setPicked(null); setOpenParam(undefined); }}>
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <strong className="u2-strong">{courses[0]?.label}</strong>
        )}
        <div className="u2-toolbar">
          <input type="search" className="u2-search" placeholder="Search this course…" aria-label="Search this course" value={q} onChange={(e) => void setQ(e.target.value || null)} />
          <span className="u2-muted" aria-live="polite">{rows.length === courseTotal ? `${courseTotal}` : `${rows.length} of ${courseTotal}`} recording{courseTotal === 1 ? "" : "s"}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="u2-box u2-rec__empty">
          <strong className="u2-strong">No recordings match</strong>
          <p className="u2-muted">Try a different word.</p>
          <div><Button size="sm" variant="ghost" onClick={() => void setQ(null)}>Clear search</Button></div>
        </div>
      ) : (
        <div className="u2-rec__layout">
          <section className="u2-rec__player" aria-label="Video player">
            {current && (
              <>
                <div className="u2-rec__frame">
                  <iframe
                    key={current.YouTubeId}
                    src={embedUrl(current.YouTubeId)}
                    title={current.Title}
                    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <div className="u2-rec__info">
                  <h2 className="u2-rec__title">{current.Title}</h2>
                  <span className="u2-rec__sub">{[current.ChapterName ? `${current.ChapterNo > 0 ? `Chapter ${current.ChapterNo} ` : ""}${current.ChapterName}` : "", near.index >= 0 ? `Lesson ${near.index + 1} of ${near.total}` : ""].filter(Boolean).join(" · ")}</span>
                  <div className="u2-rec__chips">
                    {current.Date && <Badge kind="neutral">{formatDate(current.Date) as string}</Badge>}
                    {current.DurationMin > 0 && <Badge kind="neutral">{durationLabel(current.DurationMin)}</Badge>}
                    {current.Batch && <Badge kind="info">{current.Batch}</Badge>}
                  </div>
                </div>
                <div className="u2-rec__nav">
                  <Button variant="ghost" disabled={!near.prev} disabledReason="This is the first lesson." onClick={() => near.prev && play(near.prev)}>Previous lesson</Button>
                  <Button variant="primary" disabled={!near.next} disabledReason="This is the last lesson." onClick={() => near.next && play(near.next)}>Next lesson</Button>
                </div>
              </>
            )}
          </section>

          <nav className="u2-rec__list" aria-label="Chapters">
            {groups.map((g) => {
              const open = searching || openKey === g.key;
              return (
                <section key={g.key} className="u2-rec__group" aria-label={g.heading}>
                  <button type="button" className="u2-rec__grouphead" aria-expanded={open} onClick={() => setOpenParam(open && !searching ? "" : g.key)}>
                    <span className="u2-rec__chapter">{g.heading}</span>
                    <span className="u2-rec__count">{g.rows.length}</span>
                    <span aria-hidden="true" className="u2-rec__chev">{open ? "▾" : "▸"}</span>
                  </button>
                  {open && (
                    <ul className="u2-rec__items">
                      {g.rows.map((r) => (
                        <li key={r.RecordingID}>
                          <button type="button" className="u2-rec__item" aria-current={current?.RecordingID === r.RecordingID ? "true" : undefined} onClick={() => play(r)}>
                            <span className="u2-rec__itemtitle">{r.Title}</span>
                            <span className="u2-rec__itemmeta">{[r.Date ? (formatDate(r.Date) as string) : "", durationLabel(r.DurationMin)].filter(Boolean).join(" · ")}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
