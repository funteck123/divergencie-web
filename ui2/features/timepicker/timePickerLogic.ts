// The time picker (24 Nov 2026, owner): a public, one-time tool. A person marks the days and times they can do, copies a branded message, and pastes it in
// the WhatsApp chat. Nothing is saved anywhere. All the rules live here so they are tested without a browser.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Day = (typeof DAYS)[number];

/** The first and last minute a class may start (06:00 to 23:30), counted from midnight. The grid is built from half-hour atoms; an hourly cell is two atoms. */
export const FIRST_MINUTE = 6 * 60;
export const LAST_MINUTE = 23 * 60 + 30;
export const ATOM = 30;

export const ROLES = ["Student", "Parent", "Teacher", "Staff", "Other"] as const;
export type Role = (typeof ROLES)[number];

export const atomKey = (day: Day, minute: number) => `${day}|${minute}`;

/** The start minutes of the rows: every hour (06:00, 07:00 ... 23:00) or every half hour. */
export function rowMinutes(halfHours: boolean): number[] {
  const out: number[] = [];
  for (let m = FIRST_MINUTE; m <= LAST_MINUTE; m += halfHours ? ATOM : 60) out.push(m);
  return out;
}

/** The atoms one cell covers: one in half-hour mode, two (the hour and its second half) in hourly mode. */
export const atomsOfCell = (minute: number, halfHours: boolean): number[] => (halfHours ? [minute] : [minute, minute + ATOM]);

/** "7:00 PM", "9:30 AM", "12:00 AM" (midnight, minute 1440). */
export function clockLabel(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export type CellState = "off" | "half" | "on";

export function cellState(selected: ReadonlySet<string>, day: Day, minute: number, halfHours: boolean): CellState {
  const atoms = atomsOfCell(minute, halfHours);
  const n = atoms.filter((a) => selected.has(atomKey(day, a))).length;
  return n === 0 ? "off" : n === atoms.length ? "on" : "half";
}

/** Switch cells on or off. Returns a new set; the old one is not changed. */
export function paintCells(selected: ReadonlySet<string>, cells: ReadonlyArray<{ day: Day; minute: number }>, on: boolean, halfHours: boolean): Set<string> {
  const next = new Set(selected);
  for (const { day, minute } of cells) for (const a of atomsOfCell(minute, halfHours)) (on ? next.add(atomKey(day, a)) : next.delete(atomKey(day, a)));
  return next;
}

/** Joined windows for one day: consecutive atoms become one range, "from" the first start "to" the end of the last atom. */
export function rangesForDay(selected: ReadonlySet<string>, day: Day): Array<{ from: number; to: number }> {
  const starts: number[] = [];
  for (let m = FIRST_MINUTE; m <= LAST_MINUTE; m += ATOM) if (selected.has(atomKey(day, m))) starts.push(m);
  const out: Array<{ from: number; to: number }> = [];
  for (const m of starts) {
    const last = out[out.length - 1];
    if (last && last.to === m) last.to = m + ATOM;
    else out.push({ from: m, to: m + ATOM });
  }
  return out;
}

export const formatRange = (r: { from: number; to: number }) => `${clockLabel(r.from)} to ${clockLabel(r.to)}`;

export const countAtoms = (selected: ReadonlySet<string>) => selected.size;

/** "UTC+05:30", "UTC-05:00", "UTC" for a time zone at a moment. */
export function utcOffsetLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value || "";
    const m = /GMT([+-]\d{2}:\d{2})/.exec(part);
    return m ? `UTC${m[1]}` : "UTC";
  } catch {
    return "";
  }
}

export interface TimeMessageInput {
  name: string;
  role: Role;
  subject: string;
  /** For example "India". */
  zoneName: string;
  /** For example "UTC+05:30". */
  zoneOffset: string;
  notes: string;
  selected: ReadonlySet<string>;
}

/** The message that is copied. Plain text, the same warm style as the other DivergenCIE messages, one line per day that has times. */
export function buildTimeMessage(i: TimeMessageInput): string {
  const lines: string[] = ["Hello DivergenCIE team! 😊", "", "DivergenCIE Preferred Class Times", ""];
  if (i.name.trim()) lines.push(`Name: ${i.name.trim()}`);
  lines.push(`I am a: ${i.role}`);
  if (i.subject.trim()) lines.push(`Subject: ${i.subject.trim()}`);
  lines.push(`Time zone: ${i.zoneName}${i.zoneOffset ? ` (${i.zoneOffset})` : ""}`, "");
  const dayLines = DAYS.map((d) => ({ d, r: rangesForDay(i.selected, d) })).filter((x) => x.r.length > 0).map((x) => `${x.d}: ${x.r.map(formatRange).join(", ")}`);
  lines.push(...(dayLines.length ? dayLines : ["No times chosen yet."]));
  if (i.notes.trim()) lines.push("", `Notes: ${i.notes.trim()}`);
  lines.push("", "Sent with the DivergenCIE time picker. Let us help you get A*. We care! ✨");
  return lines.join("\n");
}
