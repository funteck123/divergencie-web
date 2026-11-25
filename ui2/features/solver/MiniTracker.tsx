"use client";

import { Button } from "@/ui2/components/Button";
import { miniStats, SOLID_AT } from "./progressLogic";
import type { AttemptRow, Library, YearlyLibrary } from "./solverTypes";

/** TKT-0448: a small progress card in the empty space beside the library, so a student sees how far they have come without opening the Progress screen. Shown only where there is room (see solver.css). */
export function MiniTracker({ attempts, library, yearly, onProgress }: { attempts: readonly AttemptRow[]; library: Library; yearly: YearlyLibrary; onProgress: () => void }) {
  const s = miniStats(library, yearly, attempts);
  const w = (n: number) => `${s.total ? (n / s.total) * 100 : 0}%`;
  return (
    <aside className="u2-minitracker" aria-label="Your progress">
      <h2>Your progress</h2>
      {attempts.length === 0 ? (
        <p className="u2-muted">Your progress shows here after your first paper.</p>
      ) : (
        <>
          <p className="u2-minitracker__big"><strong>{s.solved}</strong> of {s.total} papers solved</p>
          <div className="u2-done__bar" role="img" aria-label={`${s.solved} solved, ${s.tried - s.solved} tried but not solved, ${s.total - s.tried} not tried, of ${s.total} papers`}>
            <span className="u2-done__solved" style={{ width: w(s.solved) }} />
            <span className="u2-done__tried" style={{ width: w(s.tried - s.solved) }} />
          </div>
          <p className="u2-muted">{s.tried} tried. A paper is solved at {SOLID_AT}% or more in Test mode.</p>
          {s.recent.length > 0 && (
            <>
              <div className="u2-minitracker__bars" role="img" aria-label={`Your last ${s.recent.length} Test scores, oldest to newest: ${s.recent.map((p) => `${p} percent`).join(", ")}`}>
                {s.recent.map((p, i) => <span key={i} style={{ height: `${Math.max(4, p)}%` }} title={`${p}%`} />)}
              </div>
              <p className="u2-muted">{s.note}</p>
            </>
          )}
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onProgress}>Open full progress</Button>
    </aside>
  );
}
