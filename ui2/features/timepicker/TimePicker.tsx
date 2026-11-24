"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { TIMEZONE_GROUPS, isValidTimezone, timezoneLabel } from "@/lib/timezones";
import { Button } from "@/ui2/components/Button";
import { Field, TextArea, TextInput, useFieldControl } from "@/ui2/components/Field";
import { copyToClipboard } from "@/ui2/lib/clipboard";
import { DAYS, ROLES, buildTimeMessage, cellState, clockLabel, paintCells, rowMinutes, utcOffsetLabel, type Day, type Role } from "./timePickerLogic";
import "./timepicker.css";

const DEFAULT_ZONE = "Asia/Kolkata";
const SITE = "https://www.divergencie.co.uk";

/** The person's own time zone. The server page uses the default; the browser then shows its own (no mismatch, no setState in an effect). */
function ownZone(): string {
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return own && isValidTimezone(own) ? own : DEFAULT_ZONE;
}
const noSubscribe = () => () => {};

/** A plain select that is tied to its Field's label, hint and error like the other inputs. */
function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...useFieldControl()} {...props} className="u2-input" />;
}

/** The public time picker: choose the days and times you can do, copy a branded message, paste it in WhatsApp. Nothing is stored or sent anywhere. */
export function TimePicker() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Student");
  const [subject, setSubject] = useState("");
  const detectedZone = useSyncExternalStore(noSubscribe, ownZone, () => DEFAULT_ZONE);
  const [chosenZone, setZone] = useState<string | null>(null);
  const zone = chosenZone ?? detectedZone;
  const [notes, setNotes] = useState("");
  const [halfHours, setHalfHours] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);

  const rows = useMemo(() => rowMinutes(halfHours), [halfHours]);
  const painting = useRef<{ on: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const stop = () => (painting.current = null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const paint = (cells: Array<{ day: Day; minute: number }>, on: boolean) => {
    setCopied(false);
    setManual(false);
    setSelected((s) => paintCells(s, cells, on, halfHours));
  };
  const toggleCell = (day: Day, minute: number) => paint([{ day, minute }], cellState(selected, day, minute, halfHours) !== "on");
  const toggleDay = (day: Day) => {
    const cells = rows.map((minute) => ({ day, minute }));
    paint(cells, !cells.every((c) => cellState(selected, c.day, c.minute, halfHours) === "on"));
  };
  const toggleRow = (minute: number) => {
    const cells = DAYS.map((day) => ({ day, minute }));
    paint(cells, !cells.every((c) => cellState(selected, c.day, c.minute, halfHours) === "on"));
  };

  const zoneOptions = useMemo(() => TIMEZONE_GROUPS as Array<{ label: string; options: Array<{ value: string; label: string }> }>, []);
  const message = useMemo(
    () => buildTimeMessage({ name, role, subject, zoneName: timezoneLabel(zone), zoneOffset: utcOffsetLabel(zone), notes, selected }),
    [name, role, subject, zone, notes, selected],
  );
  const hours = selected.size / 2;

  async function copy() {
    try {
      await copyToClipboard(message);
      setCopied(true);
      setManual(false);
    } catch {
      setManual(true);
    }
  }

  return (
    <div className="u2-tp">
      <aside className="u2-tp__brand">
        <Link href={SITE} className="u2-tp__logo" aria-label="DivergenCIE home">
          <Image src="/ui2/logo/icon-64.webp" alt="" width={40} height={40} priority unoptimized />
          <span>
            Divergen<span className="u2-tp__cie">CIE</span>
          </span>
        </Link>
        <div className="u2-tp__hero">
          <h1>
            Choose your class <span className="u2-tp__cie">times.</span>
          </h1>
          <p>Mark every day and time you can do. Copy the message and paste it in our WhatsApp chat. Nothing is saved on this page.</p>
        </div>
      </aside>

      <main className="u2-tp__main">
        <Link href={SITE} className="u2-tp__back">
          ← Back to site
        </Link>
        <div className="u2-tp__content">
          <section className="u2-tp__section">
            <h2>Your details</h2>
            <div className="u2-tp__fields">
              <Field label="Your name">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <Field label="I am a">
                <SelectInput value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Subject or class" hint="For example AS Level Computer Science.">
                <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
              <Field label="Time zone" hint="The times you choose are in this time zone.">
                <SelectInput value={zone} onChange={(e) => setZone(e.target.value)}>
                  {zoneOptions.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </section>

          <section className="u2-tp__section">
            <h2>Choose your times</h2>
            <div className="u2-tp__tools">
              <label className="u2-check">
                <input type="checkbox" checked={halfHours} onChange={(e) => setHalfHours(e.target.checked)} /> Show half hours
              </label>
              <span className="u2-tp__count" role="status">
                {hours === 0 ? "Nothing chosen yet" : `${hours} ${hours === 1 ? "hour" : "hours"} chosen`}
              </span>
              <Button variant="ghost" size="sm" disabled={selected.size === 0} disabledReason="Nothing to clear." onClick={() => paint(DAYS.flatMap((day) => rows.map((minute) => ({ day, minute }))), false)}>
                Clear all
              </Button>
            </div>
            <div className="u2-tp__grid" role="group" aria-label="Days and times. Press a cell to choose it. Press a day or a time to choose the whole column or row.">
              <span />
              {DAYS.map((day) => (
                <button key={day} type="button" className="u2-tp__head" aria-label={`${day}, choose or clear the whole day`} onClick={() => toggleDay(day)}>
                  {day.slice(0, 3)}
                </button>
              ))}
              {rows.map((minute) => (
                <Row key={minute} minute={minute} halfHours={halfHours} selected={selected} onRow={toggleRow} onToggle={toggleCell} painting={painting} suppressClick={suppressClick} paint={paint} />
              ))}
            </div>
            <Field label="Anything we should know?" hint="Optional." wide>
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
          </section>

          <section className="u2-tp__section">
            <h2>Your message</h2>
            <pre className="u2-tp__preview" aria-label="The message that will be copied">
              {message}
            </pre>
            <div className="u2-tp__actions">
              <Button variant="primary" onClick={copy} disabled={selected.size === 0} disabledReason="Choose at least one time first.">
                {copied ? "Copied. Now paste it in WhatsApp" : "Copy message"}
              </Button>
            </div>
            {manual && (
              <p role="alert" className="u2-tp__manual">
                Your browser did not allow copying. Select the message above and copy it by hand.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Row({ minute, halfHours, selected, onRow, onToggle, painting, suppressClick, paint }: {
  minute: number;
  halfHours: boolean;
  selected: ReadonlySet<string>;
  onRow: (minute: number) => void;
  onToggle: (day: Day, minute: number) => void;
  painting: React.MutableRefObject<{ on: boolean } | null>;
  suppressClick: React.MutableRefObject<boolean>;
  paint: (cells: Array<{ day: Day; minute: number }>, on: boolean) => void;
}) {
  return (
    <>
      <button type="button" className="u2-tp__time" aria-label={`${clockLabel(minute)}, choose or clear this time on every day`} onClick={() => onRow(minute)}>
        {clockLabel(minute)}
      </button>
      {DAYS.map((day) => {
        const state = cellState(selected, day, minute, halfHours);
        return (
          <button
            key={day}
            type="button"
            role="checkbox"
            aria-checked={state === "on" ? true : state === "half" ? "mixed" : false}
            aria-label={`${day} ${clockLabel(minute)}`}
            className="u2-tp__cell"
            data-state={state}
            // A mouse or pen can drag across cells to paint them. A finger taps and the page still scrolls. The keyboard uses Space.
            onPointerDown={(e) => {
              if (e.pointerType === "touch") return;
              const on = state !== "on";
              painting.current = { on };
              suppressClick.current = true;
              paint([{ day, minute }], on);
            }}
            onPointerEnter={(e) => {
              if (painting.current && e.pointerType !== "touch" && (e.buttons & 1) === 1) paint([{ day, minute }], painting.current.on);
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onToggle(day, minute);
            }}
          />
        );
      })}
    </>
  );
}
