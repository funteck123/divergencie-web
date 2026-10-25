import { sessionGroups, type EnrolledService } from "./portalLogic";
import "./portal.css";

/**
 * A service's weekly sessions as one small chip each ("Sunday 20:30 · 1h"), with the teacher's name once under the chips they teach,
 * instead of one long comma-joined line that the table cut off (TKT-0359).
 */
export function Sessions({ service }: { service: Pick<EnrolledService, "_myOccurrences"> }) {
  const groups = sessionGroups(service);
  if (groups.length === 0) return <span className="u2-muted">Not scheduled yet</span>;
  return (
    <div className="u2-sessions">
      {groups.map((g) => (
        <div key={g.facilitator || "none"} className="u2-sessions__group">
          <ul className="u2-sessions__list" aria-label={g.facilitator ? `Sessions with ${g.facilitator}` : "Sessions"}>
            {g.sessions.map((s, i) => (
              <li key={`${s.when}-${i}`} className="u2-sessions__chip">
                <span>{s.when}</span>
                <span className="u2-sessions__hours">{s.hours}</span>
              </li>
            ))}
          </ul>
          {g.facilitator && <span className="u2-sessions__who">{g.facilitator}</span>}
        </div>
      ))}
    </div>
  );
}
