/** Pure rules for the filter and group tools every DataTable has (ticket TKT-0327). */
export type Cell = string | number | null | undefined;
export const BLANK = "(blank)";

/** The text a value is filtered and grouped by. Blanks all become one value. */
export const valueKey = (v: Cell): string => (v === null || v === undefined || String(v).trim() === "" ? BLANK : String(v).trim());

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const byLabel = (a: string, b: string) => (a === BLANK ? 1 : b === BLANK ? -1 : collator.compare(a, b));

/** Distinct values of a column with how many rows have each, natural order, blank last. */
export function distinctValues<T>(rows: readonly T[], get: (r: T) => Cell): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = valueKey(get(r));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => byLabel(a.value, b.value));
}

export type Filters = Readonly<Record<string, ReadonlySet<string>>>;

/** Keeps rows whose value, in every filtered column, is one of the chosen values. An empty choice means no filter. */
export function applyFilters<T>(rows: readonly T[], getters: Readonly<Record<string, (r: T) => Cell>>, filters: Filters): readonly T[] {
  const active = Object.entries(filters).filter(([id, set]) => set.size > 0 && getters[id]);
  if (active.length === 0) return rows;
  return rows.filter((r) => active.every(([id, set]) => set.has(valueKey((getters[id] as (r: T) => Cell)(r)))));
}

/** Flip one value in one column's choice, returning new filters. */
export function toggleFilter(filters: Filters, columnId: string, value: string): Filters {
  const next = new Set(filters[columnId] ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  const out = { ...filters, [columnId]: next };
  if (next.size === 0) delete (out as Record<string, unknown>)[columnId];
  return out;
}

export const activeFilterCount = (filters: Filters) => Object.values(filters).reduce((n, s) => n + (s.size > 0 ? 1 : 0), 0);

export interface Group<T> { key: string; rows: T[] }
/** Splits rows into groups by a column. Rows keep their current (sorted) order inside a group. Groups are in natural order, blank last. */
export function groupRows<T>(rows: readonly T[], get: (r: T) => Cell): Group<T>[] {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = valueKey(get(r));
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return [...m].map(([key, list]) => ({ key, rows: list })).sort((a, b) => byLabel(a.key, b.key));
}

/** Big grouped tables start collapsed, so opening the page does not draw thousands of rows. */
export const GROUPS_START_OPEN_UNDER = 200;
