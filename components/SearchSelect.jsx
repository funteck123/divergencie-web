"use client";

import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Drop-in replacement for a native select (TKT-0309): same props and <option>/<optgroup>
// children, but options are always listed A to Z and the list can be narrowed
// by typing. The option with value "" stays on top as the placeholder.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function textOf(node) {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement(c) ? textOf(c.props.children) : ""))
    .join("");
}

function collect(children, group, out) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    if (c.type === Fragment) return collect(c.props.children, group, out);
    if (c.type === "optgroup") return collect(c.props.children, c.props.label, out);
    if (c.type === "option") {
      const label = textOf(c.props.children);
      out.push({ value: c.props.value !== undefined ? String(c.props.value) : label, label, disabled: !!c.props.disabled, group });
    }
  });
  return out;
}

const WRAPPER_KEYS = ["width", "maxWidth", "minWidth", "flex", "flexGrow", "flexShrink", "flexBasis", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "display", "alignSelf"];

export default function SearchSelect(props) {
  const { value, onChange, className, style, children, disabled, required, name, id, title } = props;
  const ariaLabel = props["aria-label"];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const current = value === undefined || value === null ? "" : String(value);

  const { placeholder, rows } = useMemo(() => {
    const all = collect(children, undefined, []);
    const ph = all.find((o) => o.value === "");
    const real = all.filter((o) => o !== ph);
    const ungrouped = real.filter((o) => !o.group).sort((a, b) => collator.compare(a.label, b.label));
    const groups = [...new Set(real.filter((o) => o.group).map((o) => o.group))].sort(collator.compare);
    const grouped = groups.flatMap((g) => real.filter((o) => o.group === g).sort((a, b) => collator.compare(a.label, b.label)));
    return { placeholder: ph, rows: [...ungrouped, ...grouped] };
  }, [children]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = q ? rows.filter((o) => o.label.toLowerCase().includes(q) || (o.group || "").toLowerCase().includes(q)) : rows;
    return q || !placeholder ? list : [placeholder, ...list];
  }, [rows, q, placeholder]);

  const selected = [...rows, ...(placeholder ? [placeholder] : [])].find((o) => o.value === current);
  const shownLabel = selected ? selected.label : current;

  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setBox({ left: r.left, width: Math.max(r.width, 180), top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined, max: Math.max(160, Math.min(300, (up ? r.top : below) - 16)) });
  }

  function openPanel(seed = "") {
    if (disabled) return;
    setQuery(seed);
    const idx = visible.findIndex((o) => o.value === current);
    setActive(seed ? 0 : Math.max(0, idx));
    place();
    setOpen(true);
  }

  function choose(o) {
    if (!o || o.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (onChange) onChange({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
  }

  useLayoutEffect(() => {
    if (!open) return undefined;
    const reposition = () => place();
    const outside = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);

  function onSearchKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(visible.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(visible[active]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  }

  function onTriggerKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openPanel(e.key); }
  }

  const s = style || {};
  const wrapperStyle = { position: "relative", display: s.display || "block" };
  const triggerStyle = { font: "inherit", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, width: "100%" };
  if (!className) Object.assign(triggerStyle, { background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.6rem" });
  for (const k of Object.keys(s)) {
    if (WRAPPER_KEYS.includes(k)) { if (k !== "display") wrapperStyle[k] = s[k]; } else triggerStyle[k] = s[k];
  }
  if (s.width !== undefined) triggerStyle.width = "100%";

  return (
    <div style={wrapperStyle}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={className}
        style={triggerStyle}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onTriggerKey}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: current === "" ? 0.65 : 1 }}>{shownLabel || " "}</span>
        <span aria-hidden="true" style={{ fontSize: "0.7em", opacity: 0.7, flex: "none" }}>▾</span>
      </button>
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          required={required}
          value={current}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          style={{ position: "absolute", left: "50%", bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", border: 0, padding: 0 }}
        />
      )}
      {open && box && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", zIndex: 1000, left: box.left, width: box.width, top: box.top, bottom: box.bottom, background: "var(--panel, #fff)", color: "var(--text, #111)", border: "1px solid var(--border, #ccc)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", overflow: "hidden", fontSize: "0.9rem" }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onSearchKey}
              placeholder="Type to search…"
              aria-label="Search options"
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: 0, borderBottom: "1px solid var(--border, #ccc)", background: "transparent", color: "inherit", outline: "none", font: "inherit" }}
            />
            <div ref={listRef} role="listbox" style={{ maxHeight: box.max, overflowY: "auto" }}>
              {visible.length === 0 && <div style={{ padding: "0.5rem 0.75rem", opacity: 0.6 }}>No matches</div>}
              {visible.map((o, i) => (
                <div
                  key={`${o.group || ""}|${o.value}|${i}`}
                  role="option"
                  aria-selected={o.value === current}
                  data-active={i === active}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  style={{ padding: "0.45rem 0.75rem", cursor: o.disabled ? "not-allowed" : "pointer", opacity: o.disabled ? 0.45 : o.value === "" ? 0.65 : 1, fontWeight: o.value === current ? 700 : 400, background: i === active ? "var(--panel-2, #eee)" : "transparent" }}
                >
                  {o.group && q ? <span style={{ opacity: 0.55 }}>{o.group} · </span> : null}
                  {o.label || " "}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
