"use client";

import { useState } from "react";

/** One item shows as text; several show as "N rates" that opens the full list (same behaviour as the classic cell). */
export function ExpandList({ items, label }: { items: readonly string[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <span>—</span>;
  if (items.length === 1) return <span>{items[0]}</span>;
  return (
    <span className="u2-expand">
      <button type="button" className="u2-linkbtn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} {items.length} {label}
      </button>
      {open && (
        <ul className="u2-expand__list">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </span>
  );
}
