"use client";

import * as Popover from "@radix-ui/react-popover";
import { useId, useMemo, useState } from "react";
import { Button } from "./Button";
import { activeFilterCount, distinctValues, toggleFilter, type Cell, type Filters } from "./tableTools";

export interface ToolColumn<T> { id: string; header: string; get: (r: T) => Cell }

const MAX_SHOWN = 200;
/** A column is good to group by when it has a handful of values, not one per row. */
const GROUPABLE_MAX = 60;

/**
 * The tools every table has: Filter (pick values per column), Group by, chips for what is filtered, and a count.
 * Works the same on a phone, where the table is a list of cards.
 */
export function TableTools<T>({ caption, columns, rows, filters, onFilters, group, onGroup, shown }: {
  caption: string;
  columns: readonly ToolColumn<T>[];
  rows: readonly T[];
  filters: Filters;
  onFilters: (f: Filters) => void;
  group: string;
  onGroup: (id: string) => void;
  shown: number;
}) {
  const [open, setOpen] = useState(false);
  const groupId = useId();
  const n = activeFilterCount(filters);
  const groupable = useMemo(() => columns.filter((c) => distinctValues(rows, c.get).length <= GROUPABLE_MAX), [columns, rows]);
  const label = (id: string) => columns.find((c) => c.id === id)?.header ?? id;

  return (
    <div className="u2-tt" role="toolbar" aria-label={`${caption}: filter and group`}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button size="sm" variant="ghost" aria-haspopup="dialog">{n ? `Filter (${n})` : "Filter"}</Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="u2-portal u2-tt__panel" align="start" sideOffset={4} aria-label={`Filter ${caption}`}>
            {open && <FilterSections columns={columns} rows={rows} filters={filters} onFilters={onFilters} />}
            <div className="u2-tt__foot">
              <Button size="sm" variant="ghost" disabled={n === 0} disabledReason="Nothing is filtered." onClick={() => onFilters({})}>Clear filters</Button>
              <Popover.Close asChild><Button size="sm" variant="secondary">Done</Button></Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span className="u2-tt__group">
        <label htmlFor={groupId}>Group by</label>
        <select id={groupId} className="u2-input" value={group} onChange={(e) => onGroup(e.target.value)}>
          <option value="">None</option>
          {groupable.map((c) => <option key={c.id} value={c.id}>{c.header}</option>)}
        </select>
      </span>

      {Object.entries(filters).filter(([, s]) => s.size > 0).map(([id, set]) => (
        <button key={id} type="button" className="u2-tt__chip" aria-label={`Remove filter ${label(id)}`} onClick={() => onFilters(Object.fromEntries(Object.entries(filters).filter(([k]) => k !== id)))}>
          {label(id)}: {[...set].join(", ")} <span aria-hidden="true">✕</span>
        </button>
      ))}
      <span className="u2-tt__count" role="status" aria-live="polite">{shown === rows.length ? `${rows.length} rows` : `${shown} of ${rows.length} rows`}</span>
    </div>
  );
}

function FilterSections<T>({ columns, rows, filters, onFilters }: { columns: readonly ToolColumn<T>[]; rows: readonly T[]; filters: Filters; onFilters: (f: Filters) => void }) {
  return (
    <div className="u2-tt__sections">
      {columns.map((c) => <Section key={c.id} column={c} rows={rows} filters={filters} onFilters={onFilters} />)}
    </div>
  );
}

function Section<T>({ column, rows, filters, onFilters }: { column: ToolColumn<T>; rows: readonly T[]; filters: Filters; onFilters: (f: Filters) => void }) {
  const [openSection, setOpenSection] = useState(false);
  const [q, setQ] = useState("");
  const chosen = filters[column.id];
  const values = useMemo(() => (openSection ? distinctValues(rows, column.get) : []), [openSection, rows, column]);
  const shown = values.filter((v) => v.value.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <details onToggle={(e) => setOpenSection((e.target as HTMLDetailsElement).open)}>
      <summary>{column.header}{chosen?.size ? ` (${chosen.size} chosen)` : ""}</summary>
      {openSection && (
        <div className="u2-tt__values">
          {values.length > 8 && <input type="search" className="u2-input" placeholder={`Search ${column.header}`} aria-label={`Search values of ${column.header}`} value={q} onChange={(e) => setQ(e.target.value)} />}
          {shown.slice(0, MAX_SHOWN).map((v) => (
            <label key={v.value} className="u2-tt__value">
              <input type="checkbox" checked={!!chosen?.has(v.value)} onChange={() => onFilters(toggleFilter(filters, column.id, v.value))} />
              <span>{v.value}</span>
              <span className="u2-muted">{v.count}</span>
            </label>
          ))}
          {shown.length > MAX_SHOWN && <p className="u2-muted">Showing {MAX_SHOWN} of {shown.length}. Type to narrow the list.</p>}
          {shown.length === 0 && <p className="u2-muted">No values match.</p>}
        </div>
      )}
    </details>
  );
}
