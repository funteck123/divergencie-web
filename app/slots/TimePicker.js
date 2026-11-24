"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { TIMEZONE_GROUPS, isValidTimezone, timezoneLabel } from "@/lib/timezones";
import { DAYS, ROLES, buildTimeMessage, cellState, clockLabel, paintCells, rectangleCells, rowMinutes, utcOffsetLabel } from "@/ui2/features/timepicker/timePickerLogic";

// The public time picker, in the look of the home page and the login page: navy panel with a big uppercase headline and a gold word,
// small tracked capitals, square fields with a gold focus, a gold button. Nothing is stored or sent anywhere.

const DEFAULT_ZONE = "Asia/Kolkata";
const label = "text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]";
const field = "w-full p-4 border border-[var(--border-subtle)] bg-transparent focus:border-[var(--gold)] outline-none transition-colors";

// The person's own time zone. The server page uses the default; the browser then shows its own.
const ownZone = () => {
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return own && isValidTimezone(own) ? own : DEFAULT_ZONE;
};
const noSubscribe = () => () => {};

const STEPS = [
  ["01", "Mark your times", "Every day and time you can do."],
  ["02", "Copy the message", "Ready to send."],
  ["03", "Paste it in WhatsApp", "We take it from there."],
];

export default function TimePicker() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Student");
  const [subject, setSubject] = useState("");
  const detectedZone = useSyncExternalStore(noSubscribe, ownZone, () => DEFAULT_ZONE);
  const [chosenZone, setZone] = useState(null);
  const zone = chosenZone ?? detectedZone;
  const [notes, setNotes] = useState("");
  const [halfHours, setHalfHours] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);

  const rows = useMemo(() => rowMinutes(halfHours), [halfHours]);
  // Drag a box: press one cell, then drag to the opposite corner. A mouse or pen starts at once. A finger starts after a short hold, so the page still scrolls.
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const latest = useRef({});
  useEffect(() => { latest.current = { rows, halfHours }; });
  useEffect(() => {
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest("[data-day]");
      return el ? { day: el.dataset.day, minute: Number(el.dataset.minute) } : null;
    };
    const preview = (to) => {
      const d = drag.current;
      const { rows: r, halfHours: h } = latest.current;
      setCopied(false);
      setSelected(paintCells(d.base, rectangleCells(r, d.anchor, to), d.on, h));
    };
    const move = (e) => {
      const d = drag.current;
      if (!d) return;
      if (!d.active) {
        if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 8) { clearTimeout(d.timer); drag.current = null; }
        return;
      }
      const c = cellAt(e.clientX, e.clientY);
      if (c) preview(c);
    };
    const stop = () => {
      const d = drag.current;
      if (!d) return;
      clearTimeout(d.timer);
      drag.current = null;
      setTimeout(() => (suppressClick.current = false), 0);
    };
    const noScroll = (e) => { if (drag.current?.active && e.cancelable) e.preventDefault(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("touchmove", noScroll);
    };
  }, []);

  const startDrag = (e, cell, base, on) => {
    if (e.button > 0) return;
    const d = { anchor: cell, on, base, x: e.clientX, y: e.clientY, active: false, timer: 0 };
    const begin = () => {
      d.active = true;
      suppressClick.current = true;
      setCopied(false);
      setManual(false);
      setSelected(paintCells(base, rectangleCells(rows, cell, cell), on, halfHours));
    };
    drag.current = d;
    if (e.pointerType === "touch") d.timer = window.setTimeout(begin, 220);
    else begin();
  };

  const paint = (cells, on) => {
    setCopied(false);
    setManual(false);
    setSelected((s) => paintCells(s, cells, on, halfHours));
  };
  const allOn = (cells) => cells.every((c) => cellState(selected, c.day, c.minute, halfHours) === "on");
  const toggleDay = (day) => { const cells = rows.map((minute) => ({ day, minute })); paint(cells, !allOn(cells)); };
  const toggleRow = (minute) => { const cells = DAYS.map((day) => ({ day, minute })); paint(cells, !allOn(cells)); };

  const message = useMemo(
    () => buildTimeMessage({ name, role, subject, zoneName: timezoneLabel(zone), zoneOffset: utcOffsetLabel(zone), notes, selected }),
    [name, role, subject, zone, notes, selected],
  );
  const hours = selected.size / 2;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setManual(false);
    } catch {
      setManual(true);
    }
  }

  return (
    <main className="min-h-screen flex bg-white dark:bg-[var(--bg-primary)]">
      {/* Left: the brand panel, as on the login page */}
      <div className="hidden lg:flex lg:w-[42%] sticky top-0 h-screen bg-[var(--navy)] relative overflow-hidden flex-col justify-center px-12 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,var(--gold)_0%,transparent_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--sky)_0%,transparent_60%)]"></div>
        </div>
        <div className="relative z-10 max-w-lg">
          <Link href="https://www.divergencie.co.uk" className="flex items-center gap-3 mb-10 group">
            <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo" width={40} height={40} className="w-10 h-10 object-cover group-hover:scale-110 transition-transform rounded-lg" />
            <span className="text-xl font-black tracking-tight text-white">Divergen<span className="text-[var(--gold)]">CIE</span></span>
          </Link>
          <h1 className="text-6xl font-black leading-none mb-6 uppercase tracking-tight">Choose your class <span className="text-[var(--gold)]">times.</span></h1>
          <p className="text-white/60 text-lg mb-10 font-medium">Show us when you can learn. We build your timetable around it.</p>
          <div className="border border-white/10 bg-white/5 backdrop-blur-sm divide-y divide-white/10">
            {STEPS.map(([n, title, text]) => (
              <div key={n} className="flex items-center gap-5 px-6 py-4">
                <span className="text-2xl font-black text-[var(--gold)]">{n}</span>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">{title}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: the form */}
      <div className="flex-1 min-w-0 px-6 md:px-12 pt-20 pb-16 relative">
        <Link href="https://www.divergencie.co.uk" className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to site
        </Link>

        <div className="max-w-xl w-full mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/assets/images/logo.jpg" alt="DivergenCIE logo" width={40} height={40} className="w-10 h-10 object-cover rounded-lg" />
            <span className="text-xl font-black tracking-tight text-[var(--navy)] dark:text-white">Divergen<span className="text-[var(--gold)]">CIE</span></span>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black text-[var(--navy)] dark:text-white uppercase mb-2">Your class times</h2>
            <p className="text-[var(--text-muted)] font-medium">Mark every day and time you can do.</p>
          </div>

          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="tp-name" className={label}>Your name</label>
                <input id="tp-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </div>
              <div className="space-y-2">
                <span className={label} id="tp-role">I am a</span>
                <div role="radiogroup" aria-labelledby="tp-role" className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                      className={`px-3 py-3 border text-[10px] font-black uppercase tracking-widest transition-colors ${role === r ? "bg-[var(--navy)] border-[var(--navy)] text-white" : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--gold)]"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="tp-subject" className={label}>Subject or class</label>
                <input id="tp-subject" type="text" placeholder="AS Level Computer Science" value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
              </div>
              <div className="space-y-2">
                <label htmlFor="tp-zone" className={label}>Time zone</label>
                <select id="tp-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={`${field} bg-white dark:bg-[var(--bg-primary)]`}>
                  {TIMEZONE_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* The matrix */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={halfHours} onChange={(e) => setHalfHours(e.target.checked)} className="w-4 h-4 accent-[var(--gold)]" />
                  <span className={label}>Show half hours</span>
                </label>
                <div className="flex items-center gap-4">
                  <span className={label} role="status">{hours === 0 ? "Nothing chosen yet" : `${hours} ${hours === 1 ? "hour" : "hours"} chosen`}</span>
                  {selected.size > 0 && (
                    <button type="button" onClick={() => paint(DAYS.flatMap((day) => rows.map((minute) => ({ day, minute }))), false)} className="text-[10px] font-black uppercase tracking-widest text-[var(--gold)] border-b border-[var(--gold)] pb-1">Clear all</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-[3px] select-none" role="group" aria-label="Days and times. Press a cell to choose it, or press and drag to choose a box. Press a day or a time to choose the whole column or row.">
                <span />
                {DAYS.map((day) => (
                  <button key={day} type="button" aria-label={`${day}, choose or clear the whole day`} onClick={() => toggleDay(day)}
                    className="py-2 text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white hover:text-[var(--gold)] transition-colors">
                    {day.slice(0, 3)}
                  </button>
                ))}
                {rows.map((minute) => (
                  <Row key={minute} minute={minute} halfHours={halfHours} selected={selected} onRow={toggleRow} startDrag={startDrag} suppressClick={suppressClick} paint={paint} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tp-notes" className={label}>Anything we should know</label>
              <textarea id="tp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </div>

            {/* The message */}
            <div className="space-y-3 pt-2">
              <span className={label}>Your message</span>
              <pre aria-label="The message that will be copied" className="p-5 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] dark:bg-white/5 text-sm leading-relaxed whitespace-pre-wrap break-words font-[inherit] text-[var(--text-primary)] dark:text-white">{message}</pre>
              <button type="button" onClick={copy} disabled={selected.size === 0}
                className="w-full py-4 bg-[var(--gold)] text-black text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg">
                {copied ? <><Check size={18} /> Copied. Now paste it in WhatsApp</> : <><Copy size={18} /> {selected.size === 0 ? "Choose a time first" : "Copy message"}</>}
              </button>
              {manual && <p role="alert" className="text-xs font-bold text-red-600">Your browser did not allow copying. Select the message above and copy it by hand.</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ minute, halfHours, selected, onRow, startDrag, suppressClick, paint }) {
  return (
    <>
      <button type="button" aria-label={`${clockLabel(minute)}, choose or clear this time on every day`} onClick={() => onRow(minute)}
        className="pr-2 text-right text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors whitespace-nowrap">
        {clockLabel(minute)}
      </button>
      {DAYS.map((day) => {
        const state = cellState(selected, day, minute, halfHours);
        return (
          <button key={day} type="button" role="checkbox" aria-checked={state === "on" ? true : state === "half" ? "mixed" : false} aria-label={`${day} ${clockLabel(minute)}`} data-state={state}
            className="h-9 border border-[var(--border-subtle)] transition-colors hover:border-[var(--gold)] data-[state=half]:bg-[var(--gold-light-bg)] data-[state=half]:border-[var(--gold)] data-[state=on]:bg-[var(--gold)] data-[state=on]:border-[var(--gold)]"
            data-day={day} data-minute={minute}
            onPointerDown={(e) => startDrag(e, { day, minute }, selected, state !== "on")}
            onClick={(e) => {
              if (e.detail !== 0 && suppressClick.current) return;
              paint([{ day, minute }], state !== "on");
            }}
          />
        );
      })}
    </>
  );
}
