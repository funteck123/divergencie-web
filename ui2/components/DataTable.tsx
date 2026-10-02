"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { useMediaQuery } from "@/ui2/lib/useMediaQuery";
import "./DataTable.css";

export interface Column<T> {
  id: string;
  header: string;
  /** Full header text for the tooltip when the header is shortened. */
  title?: string;
  /** Fixed width in px. Columns without a width share the space that is left. */
  width?: number;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Plain text shown on hover when the cell is cut with an ellipsis. */
  tip?: (row: T) => string | undefined;
  align?: "left" | "center" | "right";
  numeric?: boolean;
}

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  initialSort?: { id: string; dir: "asc" | "desc" };
  loading?: boolean;
  emptyText?: string;
  /** Phone layout (under 768 px): one card per row. Without it the table scrolls sideways inside its own box. */
  card?: (row: T) => ReactNode;
  selected?: ReadonlySet<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Sets row highlight, for the row whose sheet is open. */
  activeKey?: string | null;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function compare(a: string | number | null | undefined, b: string | number | null | undefined) {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // blanks sort last in both directions
  if (bEmpty) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

interface RowProps<T> {
  row: T;
  id: string;
  columns: readonly Column<T>[];
  checked: boolean | null;
  active: boolean;
  onToggle: ((id: string) => void) | null;
  /** 1-based position in the whole table, for screen readers when only part of the rows is on the page. */
  position: number;
}

/** Above this many rows (measured: drawing 125 rows took 300 ms on a loaded machine, 45 rows is fast) only the rows near the viewport are in the page (the rest is a spacer), so sorting and filtering stay fast. */
export const WINDOW_AFTER = 60;
const OVERSCAN = 12;
/** First and last row to draw for a scroll position. Pure, so it is tested without a browser. */
export function visibleRange(total: number, top: number, viewHeight: number, rowHeight: number, overscan = OVERSCAN): [number, number] {
  if (total === 0 || rowHeight <= 0) return [0, total];
  const start = Math.max(0, Math.min(total - 1, Math.floor(top / rowHeight) - overscan));
  const end = Math.min(total, Math.ceil((top + viewHeight) / rowHeight) + overscan);
  return [start, Math.max(end, start + 1)];
}

function RowInner<T>({ row, id, columns, checked, active, onToggle, position }: RowProps<T>) {
  return (
    <tr className={clsx(active && "u2-table__row--active", checked && "u2-table__row--selected")} data-row-id={id} aria-rowindex={position}>
      {onToggle && (
        <td className="u2-table__check">
          <input type="checkbox" checked={!!checked} onChange={() => onToggle(id)} aria-label={`Select ${id}`} />
        </td>
      )}
      {columns.map((c) => (
        <td key={c.id} className={clsx(c.numeric && "u2-table__num", c.align && `u2-table__${c.align}`)} title={c.tip?.(row)}>
          {c.cell(row)}
        </td>
      ))}
    </tr>
  );
}
const Row = memo(RowInner) as typeof RowInner;
function Spacer({ height, span }: { height: number; span: number }) {
  return (
    <tr aria-hidden="true" className="u2-table__spacer">
      <td colSpan={span} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

/**
 * One-line-per-row table. Fixed layout so long text is cut with an ellipsis (full text on hover) instead of
 * growing the table; the header stays pinned; sorting is by a typed accessor (blanks last, numbers numeric).
 * Rows are memoised so a keystroke in a filter re-renders only what changed.
 */
export function DataTable<T>({ rows, columns, rowKey, caption, initialSort, loading, emptyText = "Nothing to show.", card, selected, onSelectedChange, activeKey }: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const phone = useMediaQuery("(max-width: 767px)");

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const sign = sort.dir === "asc" ? 1 : -1;
    // Blanks must stay last whatever the direction, so compare them before applying the sign.
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const aEmpty = av === null || av === undefined || av === "";
      const bEmpty = bv === null || bv === undefined || bv === "";
      if (aEmpty || bEmpty) return compare(av, bv);
      return sign * compare(av, bv);
    });
  }, [rows, columns, sort]);

  // Windowing: measured row height (average of the rows on the page), scroll position of the table's own scroll box.
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [view, setView] = useState({ top: 0, height: 700 });
  const [rowH, setRowH] = useState(37);
  const windowed = !phone && sorted.length > WINDOW_AFTER;
  const onScroll = useCallback(() => {
    const el = wrapRef.current;
    if (el) setView((v) => (Math.abs(v.top - el.scrollTop) < 1 && v.height === el.clientHeight ? v : { top: el.scrollTop, height: el.clientHeight }));
  }, []);
  useEffect(() => {
    if (windowed) onScroll();
  }, [windowed, onScroll]);
  const [from, to] = windowed ? visibleRange(sorted.length, view.top, view.height, rowH) : [0, sorted.length];
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!windowed || !body) return;
    const real = [...body.querySelectorAll<HTMLElement>("tr[data-row-id]")];
    if (real.length < 5) return;
    const h = real.reduce((t, r) => t + r.offsetHeight, 0) / real.length;
    if (h > 10 && Math.abs(h - rowH) > 0.5) setRowH(h);
  }, [windowed, rowH, from, to]);

  const selectable = !!onSelectedChange;
  const toggle = (id: string) => {
    if (!onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };
  const allIds = useMemo(() => sorted.map(rowKey), [sorted, rowKey]);
  const allChecked = selectable && allIds.length > 0 && allIds.every((id) => selected?.has(id));
  const someChecked = selectable && !allChecked && allIds.some((id) => selected?.has(id));
  const toggleAll = () => onSelectedChange?.(allChecked ? new Set() : new Set(allIds));

  if (loading) {
    return (
      <div className="u2-table__wrap" aria-busy="true" aria-label={`${caption}, loading`}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="u2-skeleton u2-table__skeleton-row" />
        ))}
      </div>
    );
  }
  if (sorted.length === 0) return <p className="u2-table__empty">{emptyText}</p>;

  if (phone && card) {
    return (
      <ul className="u2-cards" aria-label={caption}>
        {sorted.map((r) => (
          <li key={rowKey(r)} className="u2-cards__item">
            {card(r)}
          </li>
        ))}
      </ul>
    );
  }

  const fixed = columns.reduce((sum, c) => sum + (c.width ?? 0), 0) + (selectable ? 28 : 0);
  return (
    <div className="u2-table__wrap" tabIndex={0} role="region" aria-label={caption} ref={wrapRef} onScroll={windowed ? onScroll : undefined}>
      <table className="u2-table" style={{ minWidth: fixed }} aria-rowcount={windowed ? sorted.length + 1 : undefined}>
        <caption className="u2-visually-hidden">{caption}</caption>
        <colgroup>
          {selectable && <col style={{ width: 28 }} />}
          {columns.map((c) => (
            <col key={c.id} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th className="u2-table__check">
                <input
                  type="checkbox"
                  checked={!!allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !!someChecked;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.id === c.id;
              return (
                <th
                  key={c.id}
                  title={c.title ?? c.header}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                  className={clsx(c.numeric && "u2-table__num", c.align && `u2-table__${c.align}`)}
                >
                  {c.sortValue ? (
                    <button type="button" className="u2-table__sort" onClick={() => setSort(active && sort.dir === "asc" ? { id: c.id, dir: "desc" } : { id: c.id, dir: "asc" })}>
                      {c.header}
                      <span aria-hidden="true">{active ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {windowed && from > 0 && <Spacer height={from * rowH} span={columns.length + (selectable ? 1 : 0)} />}
          {sorted.slice(from, to).map((r, i) => {
            const id = rowKey(r);
            return <Row key={id} row={r} id={id} position={from + i + 2} columns={columns} checked={selectable ? !!selected?.has(id) : null} active={activeKey === id} onToggle={selectable ? toggle : null} />;
          })}
          {windowed && to < sorted.length && <Spacer height={(sorted.length - to) * rowH} span={columns.length + (selectable ? 1 : 0)} />}
        </tbody>
      </table>
    </div>
  );
}
