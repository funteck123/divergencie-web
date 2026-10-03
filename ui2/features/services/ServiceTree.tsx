"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/ui2/components/Button";
import type { ServiceRecord } from "@/ui2/queries/types";
import { ExpandList } from "./ExpandList";
import { TYPE_OPTIONS_BY_GROUP } from "./serviceForm";
import { groupLabel, leavesOf, occurrenceText, rateText } from "./serviceSummary";

const keepOrder = <T,>(list: readonly T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of list) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
};

function Node({ depth, label, open, onToggle, count, children }: { depth: number; label: string; open: boolean; onToggle: () => void; count?: number; children: ReactNode }) {
  return (
    <li className="u2-tree__node" style={{ ["--depth" as string]: depth }}>
      <button type="button" className="u2-tree__toggle" aria-expanded={open} onClick={onToggle}>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> {label}
        {count !== undefined && <span className="u2-seg__count">{count}</span>}
      </button>
      {open && <ul className="u2-tree__children">{children}</ul>}
    </li>
  );
}

/** Type, then (for Student and Teacher services) Board, Course and Subject, then the services. Same grouping as the classic Services tab. */
export function ServiceTree({ groupName, services, onEdit, onDelete }: { groupName: string; services: readonly ServiceRecord[]; onEdit: (s: ServiceRecord) => void; onDelete: (s: ServiceRecord) => void }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const isCohort = groupName === "Student" || groupName === "Teacher";

  const leaf = (s: ServiceRecord) => <ServiceLine key={s.ServiceID} s={s} cohort={isCohort} showRole={groupName !== "Student"} onEdit={onEdit} onDelete={onDelete} />;

  const board = (rows: readonly ServiceRecord[]): ReactNode => {
    if (!isCohort) return rows.map(leaf);
    const withSubject = rows.filter((r) => r.Board || r.SubjectName);
    const without = rows.filter((r) => !(r.Board || r.SubjectName));
    return (
      <>
        {[...keepOrder(withSubject, (r) => r.Board || "—").entries()].map(([b, bRows]) => {
          const bk = `${groupName}::${b}`;
          return (
            <Node key={bk} depth={1} label={b} count={bRows.length} open={open.has(bk)} onToggle={() => toggle(bk)}>
              {[...keepOrder(bRows, (r) => r.Course || "—").entries()].map(([c, cRows]) => {
                const ck = `${bk}::${c}`;
                return (
                  <Node key={ck} depth={2} label={c} count={cRows.length} open={open.has(ck)} onToggle={() => toggle(ck)}>
                    {[...keepOrder(cRows, (r) => `${r.SubjectCode || ""}::${r.SubjectName || "—"}`).entries()].map(([, sRows]) => {
                      const label = sRows[0]?.SubjectName || "—";
                      const sk = `${ck}::${label}`;
                      return (
                        <Node key={sk} depth={3} label={label} count={sRows.length} open={open.has(sk)} onToggle={() => toggle(sk)}>
                          {sRows.map(leaf)}
                        </Node>
                      );
                    })}
                  </Node>
                );
              })}
            </Node>
          );
        })}
        {without.map(leaf)}
      </>
    );
  };

  const byType = keepOrder(services, (s) => s.Type || "—");
  const typeKeys = [...new Set([...byType.keys(), ...(TYPE_OPTIONS_BY_GROUP[groupName] ?? [])])];
  return (
    <ul className="u2-tree" aria-label={`${groupName} services`}>
      <li className="u2-svcline u2-svcline--head" aria-hidden="true">
        <span />
        <span>ID</span>
        <span>Name</span>
        <span>Group</span>
        <span>{groupName === "Student" ? "" : "Role"}</span>
        <span>{isCohort ? "Component / Batch" : ""}</span>
        <span>Rate</span>
        <span>Occurrences</span>
        <span />
      </li>
      {typeKeys.map((t) => {
        const rows = byType.get(t) ?? [];
        return (
          <Node key={t} depth={0} label={t} count={rows.length} open={open.has(t)} onToggle={() => toggle(t)}>
            {rows.length > 0 ? board(rows) : <li className="u2-muted u2-tree__empty">No services yet.</li>}
          </Node>
        );
      })}
    </ul>
  );
}

function ServiceLine({ s, cohort, showRole, onEdit, onDelete }: { s: ServiceRecord; cohort: boolean; showRole: boolean; onEdit: (s: ServiceRecord) => void; onDelete: (s: ServiceRecord) => void }) {
  const [open, setOpen] = useState(false);
  const leaves = leavesOf(s);
  const single = leaves.length === 1 ? leaves[0] : undefined;
  return (
    <li className="u2-tree__service">
      <div className="u2-svcline">
        {single ? <span className="u2-svcline__spacer" /> : (
          <button type="button" className="u2-tree__toggle" aria-expanded={open} aria-label={`Show ${leaves.length} batches of ${s.Name}`} onClick={() => setOpen((o) => !o)}>
            {open ? "▾" : "▸"}
          </button>
        )}
        <span className="u2-mono">{s.ServiceID}</span>
        <strong className="u2-strong u2-svcline__name" title={s.Name}>
          {s.Name}
        </strong>
        <span className="u2-muted">{groupLabel(s)}</span>
        {showRole && <span>{[s.Role, s.Department].filter(Boolean).join(" · ") || "—"}</span>}
        {cohort && <span>{single ? [single.componentName, single.batchName].filter(Boolean).join(" / ") || "—" : `${leaves.length} batches`}</span>}
        <span>{single ? <ExpandList items={single.rates.map(rateText)} label="rates" /> : "—"}</span>
        <span className="u2-muted">{single ? <ExpandList items={single.occurrences.map(occurrenceText)} label="occurrences" /> : "—"}</span>
        <span className="u2-rowactions">
          <Button size="sm" variant="ghost" onClick={() => onEdit(s)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="u2-danger-text" onClick={() => onDelete(s)}>
            Delete
          </Button>
        </span>
      </div>
      {open && !single && (
        <ul className="u2-batchlist" aria-label={`Batches of ${s.Name}`}>
          {leaves.map((l) => (
            <li key={l.key} className="u2-batch">
              <h4 className="u2-batch__title">{[l.componentName, l.batchName].filter(Boolean).join(" / ") || "Batch"}</h4>
              <dl className="u2-batch__facts">
                <div>
                  <dt>Rates ({l.rates.length})</dt>
                  <dd>
                    {l.rates.length === 0 ? <span className="u2-muted">None</span> : <ul>{l.rates.map((r, i) => <li key={i}>{rateText(r)}</li>)}</ul>}
                  </dd>
                </div>
                <div>
                  <dt>Occurrences ({l.occurrences.length})</dt>
                  <dd>
                    {l.occurrences.length === 0 ? <span className="u2-muted">None</span> : <ul>{l.occurrences.map((o, i) => <li key={i}>{occurrenceText(o)}</li>)}</ul>}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
