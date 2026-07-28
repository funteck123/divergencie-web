import path from "path";
import { createCanvas, loadImage, registerFont } from "canvas";
import { timezoneLabel as lookupTimezoneLabel } from "@/lib/timezones";

// Header/day-row/branding art is p26's original template PNG (untouched).
// The row area below the day header — p26's baked-in fixed 8 time-slots
// (4:30pm-11:30pm hourly) — is painted over and redrawn per-request with as
// many rows as the user's actual occurrence times need, so no occurrence
// time is ever silently dropped (p26's own behaviour, since fixed).

const ASSETS_DIR = path.join(process.cwd(), "lib", "schedule-image", "assets");
const FONT_PATH = path.join(ASSETS_DIR, "Roboto.ttf");
registerFont(FONT_PATH, { family: "Roboto" });

// Same hex values as lib/client.js's GROUP_COLORS (kept as a separate copy
// here since this module is server/Canvas-only and that file is "use
// client" — see components/ScheduleCalendar.jsx for the on-screen
// equivalent). Keyed by the actual Group name (Student/Teacher/Staff/
// Ambassador/Management/Parent) — entity.role uses different strings
// (student/teacherRole/staff), see ROLE_TO_GROUP below.
const GROUP_COLORS = {
  Student: "#3b82f6",
  Teacher: "#22c55e",
  Staff: "#f59e0b",
  Ambassador: "#a855f7",
  Management: "#ef4444",
  Parent: "#14b8a6",
};
const ROLE_TO_GROUP = { student: "Student", teacherRole: "Teacher", staff: "Staff" };

// Fills a block with one solid color, or a hard-split multi-band gradient
// when `groups` has more than one entry (a Service open to several account
// types at once) — same idea as the on-screen calendar's groupGradient
// (components/ScheduleCalendar.jsx), just drawn directly onto Canvas
// instead of CSS.
function fillGroupBands(ctx, x, y, w, h, groups) {
  const list = groups && groups.length ? groups : ["Student"];
  const bandW = w / list.length;
  list.forEach((g, i) => {
    ctx.fillStyle = GROUP_COLORS[g] || "#6b7280";
    ctx.fillRect(x + i * bandW, y, bandW, h);
  });
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_TO_COL = Object.fromEntries(DAYS.map((d, i) => [d, i]));
const NUM_COLS = 7;

// Column geometry sampled/ported from the template — same 7 x-positions the
// baked day-header row above already uses, so the redrawn grid lines up.
const GRID_TOP_LEFT_X = 279;
const GRID_COL_WIDTH = 216;
const GRID_COL_PADDING = 29;

// Row area bounding box: covers the old magenta time column + white cells
// (measured empirically across both templates), leaves the day-header row
// and bottom decorative dots untouched.
const ROW_AREA = { left: 20, right: 1968, top: 300, bottom: 1360 };
const TIME_COL_LEFT = 36;
const TIME_COL_WIDTH = 216;

const FALLBACK_TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

// One template per role — the row area below the day header is fully
// repainted per-request regardless (see comment above), so the template
// file's own baked-in time labels never actually show. The Time Zone field
// on the template is a blank line filled in with whatever timezone string
// is passed in, so a single template works for every timezone, not just
// the original India/Saudi pair.
const THEMES = {
  // The day-header bar baked into this template sits at y~310-419 (below
  // the logo already) — the shared ROW_AREA.top of 300 used to start
  // repainting a few pixels into it and erase it entirely. rowAreaTop
  // pushes the redrawn grid to start right after the header instead.
  student: {
    file: path.join(ASSETS_DIR, "student-ist.png"),
    nameCoord: [1422, 125],
    classCoord: [1422, 199],
    timezoneCoord: [1422, 256],
    rowAreaTop: 425,
  },
  // Teacher accounts get the Teacher Schedule template; Staff accounts get
  // the plain Staff Schedule template. Both share the same field layout
  // (Name / Batch-or-Department / Time Zone
  // drawn side by side below the logo, with the day header starting right
  // below that row — rowAreaTop is pushed down accordingly so the redrawn
  // grid never collides with the taller header).
  teacherRole: {
    file: path.join(ASSETS_DIR, "teacher-schedule.png"),
    nameCoord: [435, 235],
    classCoord: [1055, 235],
    timezoneCoord: [1715, 235],
    valueFont: "38px Roboto",
    nameMaxWidth: 370,
    classMaxWidth: 370,
    timezoneMaxWidth: 210,
    rowAreaTop: 410,
  },
  staff: {
    file: path.join(ASSETS_DIR, "staff-schedule.png"),
    nameCoord: [435, 235],
    // "Department:" is a longer baked-in label than teacherRole's "Batch:" —
    // reusing the same x=1055 the Teacher template uses made the value text
    // overlap the tail end of "Department:". Pixel-measured where the label
    // text actually ends and its dashed placeholder line begins (~x=1090) so
    // the value starts right after the label, same convention as Name/Time
    // Zone, instead of leaving a gap further right.
    classCoord: [1115, 235],
    timezoneCoord: [1715, 235],
    valueFont: "38px Roboto",
    nameMaxWidth: 370,
    classMaxWidth: 370,
    timezoneMaxWidth: 210,
    rowAreaTop: 410,
  },
};

function themeFor(role) {
  if (role === "teacherRole") return THEMES.teacherRole;
  if (role === "staff") return THEMES.staff;
  return THEMES.student;
}

// The Time Zone field is a single fixed-width blank line on the template —
// truncate very long labels (e.g. some IANA ids) so they don't run past it.
function shortTimezoneLabel(tz) {
  const label = lookupTimezoneLabel(tz);
  return label.length > 22 ? `${label.slice(0, 19)}...` : label;
}

// Shrinks text char-by-char (with a trailing "…") until it fits maxWidth
// under ctx's currently-set font — used for the compact side-by-side
// Name/Batch-or-Department/Time Zone fields on the Staff/Teacher templates,
// where a long value would otherwise run into the next field's label.
function fitText(ctx, text, maxWidth) {
  if (!maxWidth || ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function colLeft(col) {
  return GRID_TOP_LEFT_X + col * (GRID_COL_WIDTH + GRID_COL_PADDING);
}

function to12Hour(time24) {
  const [h, m] = (time24 || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// textwrap.wrap(name, width=15) equivalent — greedy word wrap at ~15 chars.
function wrapText(text, width = 15) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

// entity: { name, role: "student"|"staff"|"teacherRole", timezone: IANA timezone id, className }
// entries: [{ name, day, time }] — name is the class/service label for that cell.
export async function drawSchedule(entity, entries) {
  const theme = themeFor(entity.role);
  const timezoneLabel = shortTimezoneLabel(entity.timezone);

  const img = await loadImage(theme.file);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const valueFont = theme.valueFont || "45px Roboto";

  // PIL anchor="lb" (left-baseline) == canvas textBaseline "alphabetic" + textAlign "left".
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "white";
  ctx.font = valueFont;
  const nameCoord = [theme.nameCoord[0] + 25, theme.nameCoord[1] - 10];
  const classCoord = [theme.classCoord[0] + 25, theme.classCoord[1] - 10];
  const timezoneCoord = [theme.timezoneCoord[0] + 25, theme.timezoneCoord[1] - 10];

  ctx.fillText(fitText(ctx, entity.name, theme.nameMaxWidth), nameCoord[0], nameCoord[1]);
  // Student's class-name slot stays blank (no single class to show — see
  // route.js); Teacher/Staff use the same slot for Batch/Department instead.
  if (entity.className) {
    // The Staff template's "Department:" label is long enough that its own
    // baked dashed placeholder line (a thin ~2px rule sitting ~7px below
    // the text baseline, not overlapping the label's own text height) starts
    // right after the label — before the value's start position, once that
    // was nudged right to match Name/Time Zone's spacing. Erase just that
    // thin gap (not the label, not the text height) so no bare dash segment
    // shows between the label and the value.
    if (entity.role === "staff") {
      ctx.fillStyle = "#5c2378";
      ctx.fillRect(classCoord[0] - 68, classCoord[1] + 4, 68, 8);
      ctx.fillStyle = "white";
    }
    ctx.fillText(fitText(ctx, entity.className, theme.classMaxWidth), classCoord[0], classCoord[1]);
  }
  ctx.fillText(fitText(ctx, `${timezoneLabel} Time`, theme.timezoneMaxWidth), timezoneCoord[0], timezoneCoord[1]);

  // Every distinct time actually in use becomes its own row — this is what
  // fixes p26's fixed-8-slot limitation (any time can now show up).
  const distinctTimes = [...new Set(entries.map((e) => e.time))].sort();
  const rowTimes = distinctTimes.length ? distinctTimes : FALLBACK_TIMES;
  const numRows = rowTimes.length;
  const timeToRow = Object.fromEntries(rowTimes.map((t, i) => [t, i]));

  const rowArea = { ...ROW_AREA, top: theme.rowAreaTop || ROW_AREA.top };

  // Paint over the old baked-in time column + cells, then redraw fresh.
  ctx.fillStyle = "#3d1760";
  ctx.fillRect(rowArea.left, rowArea.top, rowArea.right - rowArea.left, rowArea.bottom - rowArea.top);

  const rowHeight = (rowArea.bottom - rowArea.top) / numRows;
  const timeFontSize = Math.max(12, Math.min(22, rowHeight * 0.3));
  const cellFontSize = Math.max(11, Math.min(25, rowHeight * 0.28));
  const dividerHeight = Math.max(1, Math.min(3, rowHeight * 0.03));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let row = 0; row < numRows; row++) {
    const rowTop = rowArea.top + row * rowHeight;
    const rowCenterY = rowTop + rowHeight / 2;

    ctx.fillStyle = "#c03fa9";
    ctx.fillRect(TIME_COL_LEFT, rowTop, TIME_COL_WIDTH, rowHeight - dividerHeight);
    ctx.fillStyle = "#ffde59";
    ctx.font = `${timeFontSize}px Roboto`;
    ctx.fillText(to12Hour(rowTimes[row]), TIME_COL_LEFT + TIME_COL_WIDTH / 2, rowCenterY);

    for (let col = 0; col < NUM_COLS; col++) {
      ctx.fillStyle = GROUP_COLORS[ROLE_TO_GROUP[entity.role]] || "#f9f5ff";
      ctx.fillRect(colLeft(col), rowTop, GRID_COL_WIDTH, rowHeight - dividerHeight);
    }
  }

  ctx.fillStyle = GROUP_COLORS[ROLE_TO_GROUP[entity.role]] ? "white" : "black";
  ctx.font = `${cellFontSize}px Roboto`;

  for (const entry of entries) {
    const { day, time } = entry;
    if (!(day in DAY_TO_COL) || !(time in timeToRow)) continue;
    const row = timeToRow[time];
    const col = DAY_TO_COL[day];
    const centerX = colLeft(col) + GRID_COL_WIDTH / 2;
    const centerY = rowArea.top + row * rowHeight + (rowHeight - dividerHeight) / 2;

    const lines = wrapText(entry.name, 15);
    const lineHeight = cellFontSize;
    if (lines.length > 1) {
      let y = centerY - (lineHeight * (lines.length - 1)) / 2;
      for (const line of lines) {
        ctx.fillText(line, centerX, y);
        y += lineHeight;
      }
    } else {
      ctx.fillText(lines[0], centerX, centerY);
    }
  }

  return canvas.toBuffer("image/png");
}

// A fresh, dynamically-sized whole-week grid (no per-user template
// background — this shows every Service's occurrences at once, not one
// person's). The one thing the per-person drawSchedule() above genuinely
// can't do: when two+ occurrences land on the same day+time (a real
// scheduling conflict, or just two classes sharing a slot with different
// facilitators), it silently draws both labels centered on top of each
// other. Here, each day+time cell is a variable-height stack — one colored
// block per occurrence, with its own facilitator/service label — and the
// WHOLE ROW grows to fit the busiest day in that row, so a Tuesday with 3
// overlapping classes doesn't cramp Monday's single class into the same
// tiny row.
const ADMIN_BG = "#3d1760";
const ADMIN_HEADER_BG = "#c03fa9";
const ADMIN_CELL_BG = "#f9f5ff";
const ADMIN_GOLD = "#ffde59";

// Word-wraps `text` to fit `maxWidth` under ctx's CURRENT font, using real
// measured widths (not a fixed character-count guess like wrapText() above)
// — needed here because block height is computed FROM the resulting line
// count, so an inaccurate wrap would silently reintroduce the same
// overflow bug this function exists to avoid.
function wrapTextToWidth(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

// entries: [{ day, time, duration?, serviceName, facilitator?, group? }] — every
// occurrence across every Service, unfiltered by user (see
// app/api/schedule/admin-image/route.js, which flattens db.services'
// OccuranceList entries this way).
export async function drawAdminSchedule(entries) {
  const PAGE_W = 2000;
  const MARGIN = 24;
  const HEADER_H = 90;
  const DAY_HEADER_H = 56;
  const TIME_COL_W = 140;
  const dayColW = (PAGE_W - MARGIN * 2 - TIME_COL_W) / NUM_COLS;
  const ENTRY_FONT_SIZE = 13;
  const ENTRY_LINE_H = ENTRY_FONT_SIZE + 4;
  const ENTRY_PAD = 10;
  const ENTRY_TEXT_MAX_W = dayColW - 16;

  const validEntries = entries.filter((e) => e.day in DAY_TO_COL && e.time);
  const distinctTimes = [...new Set(validEntries.map((e) => e.time))].sort();
  const rowTimes = distinctTimes.length ? distinctTimes : FALLBACK_TIMES;

  const cellMap = new Map();
  for (const e of validEntries) {
    const key = `${e.day}|${e.time}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(e);
  }

  // Pre-measure every entry's wrapped label (needs a live 2D context to
  // call measureText — a throwaway 1x1 canvas is enough, avoids drawing
  // twice on the real canvas just to size things first).
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `${ENTRY_FONT_SIZE}px Roboto`;
  let maxEntryLines = 1;
  for (const e of validEntries) {
    const label = e.facilitator ? `${e.serviceName} · ${e.facilitator}` : e.serviceName;
    const lines = wrapTextToWidth(measureCtx, label, ENTRY_TEXT_MAX_W);
    e._lines = lines;
    if (lines.length > maxEntryLines) maxEntryLines = lines.length;
  }
  // Every stacked block uses the SAME height — sized for the longest label
  // anywhere in this dataset — rather than each entry's own line count, so
  // blocks in a shared cell line up evenly instead of a ragged stack.
  const ENTRY_H = maxEntryLines * ENTRY_LINE_H + ENTRY_PAD;

  const MIN_ROW_H = 64;
  const rowHeights = rowTimes.map((t) => {
    let maxStack = 1;
    for (const day of DAYS) {
      const count = (cellMap.get(`${day}|${t}`) || []).length;
      if (count > maxStack) maxStack = count;
    }
    return Math.max(MIN_ROW_H, maxStack * ENTRY_H + 10);
  });
  const totalRowsH = rowHeights.reduce((a, b) => a + b, 0);
  const PAGE_H = HEADER_H + DAY_HEADER_H + totalRowsH + MARGIN * 2;

  const canvas = createCanvas(PAGE_W, PAGE_H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = ADMIN_BG;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ADMIN_GOLD;
  ctx.font = "bold 36px Roboto";
  ctx.fillText("Admin Weekly Schedule", MARGIN, MARGIN + 36);
  ctx.fillStyle = ADMIN_CELL_BG;
  ctx.font = "18px Roboto";
  ctx.fillText(`Generated ${new Date().toISOString().slice(0, 10)} — every occurrence, every service`, MARGIN, MARGIN + 62);

  let y = HEADER_H;
  ctx.fillStyle = ADMIN_HEADER_BG;
  ctx.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, DAY_HEADER_H);
  ctx.fillStyle = "white";
  ctx.font = "bold 22px Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Time", MARGIN + TIME_COL_W / 2, y + DAY_HEADER_H / 2);
  DAYS.forEach((d, i) => {
    const x = MARGIN + TIME_COL_W + i * dayColW;
    ctx.fillText(d, x + dayColW / 2, y + DAY_HEADER_H / 2);
  });
  y += DAY_HEADER_H;

  for (let r = 0; r < rowTimes.length; r++) {
    const rowH = rowHeights[r];

    ctx.fillStyle = ADMIN_HEADER_BG;
    ctx.fillRect(MARGIN, y, TIME_COL_W - 2, rowH - 2);
    ctx.fillStyle = ADMIN_GOLD;
    ctx.font = "16px Roboto";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(to12Hour(rowTimes[r]), MARGIN + TIME_COL_W / 2, y + rowH / 2);

    for (let c = 0; c < NUM_COLS; c++) {
      const x = MARGIN + TIME_COL_W + c * dayColW;
      ctx.fillStyle = ADMIN_CELL_BG;
      ctx.fillRect(x, y, dayColW - 2, rowH - 2);

      const cellEntries = cellMap.get(`${DAYS[c]}|${rowTimes[r]}`) || [];
      const blockH = (rowH - 2) / Math.max(1, cellEntries.length);
      cellEntries.forEach((entry, idx) => {
        const blockY = y + idx * blockH;
        fillGroupBands(ctx, x + 2, blockY + 1, dayColW - 6, blockH - 2, entry.group);

        ctx.fillStyle = "white";
        ctx.font = `${ENTRY_FONT_SIZE}px Roboto`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = entry._lines;
        const centerX = x + dayColW / 2;
        const centerY = blockY + blockH / 2;
        if (lines.length > 1) {
          let ly = centerY - (ENTRY_LINE_H * (lines.length - 1)) / 2;
          for (const line of lines) {
            ctx.fillText(line, centerX, ly);
            ly += ENTRY_LINE_H;
          }
        } else {
          ctx.fillText(lines[0], centerX, centerY);
        }
      });
    }
    y += rowH;
  }

  return canvas.toBuffer("image/png");
}
