"use client";

import { useState } from "react";

// TKT-0129/0130: search-only extract of Management's own BillingFilterBar
// (app/dashboard/management/page.js), which stayed local/unexported and
// couldn't be reused outside that one file. Every other dashboard's own
// tables (Student/Teacher/Staff/Ambassador/Parent/Trial) had sort
// (SortableTh) but no search box at all. Deliberately NOT a refactor of
// BillingFilterBar itself — that one's status-dropdown option is
// Management-specific (STATUS_FILTER_LABEL) and already works; duplicating
// its plain-search behavior here into a new shared component avoids any
// risk of touching that working code, at the cost of the same collapse
// logic existing in two places. If a status dropdown is ever needed
// outside Management, this is the file to extend, not re-duplicate again.
//
// Progressive disclosure (Springer & Whittaker 2018): a search box sitting
// on the page at all times, even when nobody is filtering, is exactly the
// "full detail upfront" the paper found doesn't help — collapsed behind
// one small toggle by default, active state still visible on the toggle
// itself so a forgotten filter is never silent.
export default function FilterBar({ search, onSearch, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const active = !!search.trim();

  if (!open && !active) {
    return (
      <button type="button" className="btn-ghost text-sm mb-3" onClick={() => setOpen(true)}>
        ⌕ Filter
      </button>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          className="field"
          style={{ maxWidth: 220 }}
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {active && (
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              onSearch("");
              setOpen(false);
            }}
          >
            Clear
          </button>
        )}
        {!active && (
          <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
      </div>
    </div>
  );
}
