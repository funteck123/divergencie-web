"use client";

import { useDeferredValue, useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { Button } from "@/ui2/components/Button";
import { Skeleton } from "@/ui2/components/Skeleton";
import { useRecordings, type RecordingRecord } from "@/ui2/queries/recordings";
import { durationLabel, embedUrl, filterRecordings, groupByChapter, subjectsOf, subjectLabel } from "./recordingsLogic";
import "@/ui2/features/accounts/accounts.css";
import "./recordings.css";

/** Class recordings, grouped by chapter, played inside the portal (TKT-0358). The server already limits the list to this person's subjects. */
export function RecordingLibrary() {
  const { data, isPending, error, refetch } = useRecordings();
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [subject, setSubject] = useQueryState("subject", parseAsString.withDefault(""));
  const [picked, setPicked] = useQueryState("v", parseAsString.withDefault(""));
  const deferredQ = useDeferredValue(q);

  const all = useMemo(() => data ?? [], [data]);
  const subjects = useMemo(() => subjectsOf(all), [all]);
  const activeSubject = subjects.some((s) => s.code === subject) ? subject : "";
  const rows = useMemo(() => filterRecordings(all, { q: deferredQ, subject: activeSubject }), [all, deferredQ, activeSubject]);
  const groups = useMemo(() => groupByChapter(rows), [rows]);
  const current: RecordingRecord | undefined = rows.find((r) => r.RecordingID === picked) ?? groups[0]?.rows[0];

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
      <div className="u2-toolbar">
        <input type="search" className="u2-search" placeholder="Search recordings…" aria-label="Search recordings" value={q} onChange={(e) => void setQ(e.target.value || null)} />
        {subjects.length > 1 && (
          <div className="u2-seg" role="group" aria-label="Subject">
            <button type="button" className="u2-seg__btn" aria-pressed={!activeSubject} data-on={!activeSubject} onClick={() => void setSubject(null)}>All subjects</button>
            {subjects.map((s) => (
              <button key={s.code} type="button" className="u2-seg__btn" aria-pressed={activeSubject === s.code} data-on={activeSubject === s.code} onClick={() => void setSubject(s.code)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <span className="u2-muted" aria-live="polite">{rows.length === all.length ? `${all.length}` : `${rows.length} of ${all.length}`} recording{all.length === 1 ? "" : "s"}</span>
      </div>

      {rows.length === 0 ? (
        <div className="u2-box u2-rec__empty">
          <strong className="u2-strong">No recordings match</strong>
          <p className="u2-muted">Try a different word, or show all subjects.</p>
          <div><Button size="sm" variant="ghost" onClick={() => { void setQ(null); void setSubject(null); }}>Clear search</Button></div>
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
                  <span className="u2-rec__sub">{subjectLabel(current)}{current.ChapterName ? ` · ${current.ChapterNo > 0 ? `Chapter ${current.ChapterNo} ` : ""}${current.ChapterName}` : ""}</span>
                  <div className="u2-rec__chips">
                    {current.Date && <Badge kind="neutral">{formatDate(current.Date) as string}</Badge>}
                    {current.DurationMin > 0 && <Badge kind="neutral">{durationLabel(current.DurationMin)}</Badge>}
                    {current.Batch && <Badge kind="info">{current.Batch}</Badge>}
                  </div>
                </div>
              </>
            )}
          </section>

          <nav className="u2-rec__list" aria-label="Recordings by chapter">
            {groups.map((g) => (
              <section key={g.key} className="u2-rec__group" aria-label={g.heading}>
                <header className="u2-rec__grouphead">
                  <strong className="u2-strong">{g.heading}</strong>
                  {subjects.length > 1 && !activeSubject && <span className="u2-rec__sub">{g.subject}</span>}
                </header>
                <ul className="u2-rec__items">
                  {g.rows.map((r) => (
                    <li key={r.RecordingID}>
                      <button type="button" className="u2-rec__item" aria-current={current?.RecordingID === r.RecordingID ? "true" : undefined} onClick={() => void setPicked(r.RecordingID)}>
                        <span className="u2-rec__itemtitle">{r.Title}</span>
                        <span className="u2-rec__itemmeta">{[r.Date ? (formatDate(r.Date) as string) : "", durationLabel(r.DurationMin)].filter(Boolean).join(" · ")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
