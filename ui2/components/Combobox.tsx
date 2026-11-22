"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { useId, useMemo, useState } from "react";
import { useFieldControl } from "./Field";
import "./Combobox.css";

/** The cloud for a saved copy. Decorative and quiet: small, faint, and named only in the tooltip. */
function SavedMark() {
  return (
    <svg className="u2-combo__saved" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <title>Saved copy: opens even when the main server is off</title>
      <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 6 18.5h11.5z" />
    </svg>
  );
}

export interface ComboOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  /** A very small, quiet cloud after the label: this paper has a saved copy that opens even when the main server is off (TKT-0420). */
  saved?: boolean;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboOption[];
  /** Label of the empty choice (value ""), shown first. Omit when a value is required. */
  placeholder?: string;
  /** Accessible name when no visible label points at it. */
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
  /** Placeholder text of the search box. */
  searchPlaceholder?: string;
  /** The person may type a value that is not in the list (offered as a "Use ..." row). */
  allowCustom?: boolean;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * A select you can narrow by typing. Same rule as the classic SearchSelect: options are always listed A to Z
 * (ungrouped first, then each group A to Z), the empty choice stays on top. Arrow keys, Enter and Escape work.
 */
export function Combobox({ value, onChange, options, placeholder, id, disabled, searchPlaceholder = "Type to search…", allowCustom, ...aria }: ComboboxProps) {
  const field = useFieldControl();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();

  const { ungrouped, groups } = useMemo(() => {
    const sorted = [...options].sort((a, b) => collator.compare(a.label, b.label));
    const ungrouped = sorted.filter((o) => !o.group);
    const names = [...new Set(sorted.filter((o) => o.group).map((o) => o.group as string))].sort(collator.compare);
    return { ungrouped, groups: names.map((g) => ({ name: g, items: sorted.filter((o) => o.group === g) })) };
  }, [options]);

  const selected = options.find((o) => o.value === value);
  const shown = selected ? selected.label : placeholder && value === "" ? placeholder : value || placeholder || "";

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };
  const typed = search.trim();
  const offerCustom = !!allowCustom && typed !== "" && !options.some((o) => o.label.toLowerCase() === typed.toLowerCase());

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <Popover.Trigger id={id ?? field.id} aria-describedby={field["aria-describedby"]} type="button" disabled={disabled} className="u2-combo__trigger" role="combobox" aria-expanded={open} aria-controls={listId} aria-label={aria["aria-label"]}>
        <span className={selected || value ? "" : "u2-combo__placeholder"} title={selected || value ? shown : undefined}>{shown || "Select…"}</span>
        <span aria-hidden="true">▾</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="u2-portal u2-combo__panel" align="start" sideOffset={4} onOpenAutoFocus={(e) => e.stopPropagation()}>
          <Command label={aria["aria-label"] ?? "Options"} filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
            <Command.Input className="u2-combo__search" placeholder={searchPlaceholder} autoFocus value={search} onValueChange={setSearch} />
            <Command.List id={listId} className="u2-combo__list">
              {!offerCustom && <Command.Empty className="u2-combo__empty">No match.</Command.Empty>}
              {offerCustom && (
                <Command.Item forceMount value={`__custom ${typed}`} className="u2-combo__item" onSelect={() => pick(typed)}>
                  Use &quot;{typed}&quot;
                </Command.Item>
              )}
              {placeholder !== undefined && (
                <Command.Item value={`__empty ${placeholder}`} className="u2-combo__item u2-combo__item--empty" onSelect={() => pick("")} data-checked={value === ""}>
                  {placeholder}
                </Command.Item>
              )}
              {ungrouped.map((o) => (
                <Command.Item key={o.value} value={o.label + " " + o.value} disabled={o.disabled} className="u2-combo__item" onSelect={() => pick(o.value)} data-checked={o.value === value}>
                  {o.label}
                  {o.saved && <SavedMark />}
                </Command.Item>
              ))}
              {groups.map((g) => (
                <Command.Group key={g.name} heading={g.name} className="u2-combo__group">
                  {g.items.map((o) => (
                    <Command.Item key={o.value} value={`${o.label} ${o.group} ${o.value}`} disabled={o.disabled} className="u2-combo__item" onSelect={() => pick(o.value)} data-checked={o.value === value}>
                      {o.label}
                      {o.saved && <SavedMark />}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
