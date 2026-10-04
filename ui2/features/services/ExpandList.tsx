"use client";

import { Button } from "@/ui2/components/Button";
import { useState } from "react";

/** One item shows as text; several show as "N rates" that opens the full list (same behaviour as the classic cell). */
export function ExpandList({ items, label }: { items: readonly string[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <span>—</span>;
  if (items.length === 1) return <span>{items[0]}</span>;
  return (
    <span className="u2-expand">
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} {items.length} {label}
      </Button>
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
