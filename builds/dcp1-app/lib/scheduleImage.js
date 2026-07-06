import path from "path";
import { createCanvas, loadImage, registerFont } from "canvas";

// Header/day-row/branding art is p26's original template PNG (untouched).
// The row area below the day header — p26's baked-in fixed 8 time-slots
// (4:30pm-11:30pm hourly) — is painted over and redrawn per-request with as
// many rows as the user's actual occurrence times need, so no occurrence
// time is ever silently dropped (p26's own behaviour, since fixed).

const ASSETS_DIR = path.join(process.cwd(), "lib", "schedule-image", "assets");
const FONT_PATH = path.join(ASSETS_DIR, "Roboto.ttf");
registerFont(FONT_PATH, { family: "Roboto" });

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

const THEMES = {
  teacher: {
    file: path.join(ASSETS_DIR, "teacher-ist.png"),
    nameCoord: [639, 105],
    classCoord: [0, 0],
    timezoneCoord: [1684, 105],
  },
  student_India: {
    file: path.join(ASSETS_DIR, "student-ist.png"),
    nameCoord: [1422, 125],
    classCoord: [1422, 199],
    timezoneCoord: [1422, 256],
  },
  student_Saudi: {
    file: path.join(ASSETS_DIR, "student-saudi.png"),
    nameCoord: [1422, 125],
    classCoord: [1422, 199],
    timezoneCoord: [1422, 256],
  },
};

function themeFor(role, timezone) {
  if (role === "teacher") return THEMES.teacher;
  return timezone === "Saudi" ? THEMES.student_Saudi : THEMES.student_India;
}

function colLeft(col) {
  return GRID_TOP_LEFT_X + col * (GRID_COL_WIDTH + GRID_COL_PADDING);
}

function to12Hour(time24) {
  const [h, m] = time24.split(":").map(Number);
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

// entity: { name, role: "student"|"teacher", timezone: "India"|"Saudi", className }
// entries: [{ name, day, time }] — name is the class/service label for that cell.
export async function drawSchedule(entity, entries) {
  const theme = themeFor(entity.role, entity.timezone);
  const timezoneLabel = entity.timezone === "Saudi" ? "Saudi" : "India";

  const img = await loadImage(theme.file);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const headerFont = "45px Roboto";

  // PIL anchor="lb" (left-baseline) == canvas textBaseline "alphabetic" + textAlign "left".
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "white";
  ctx.font = headerFont;
  const nameCoord = [theme.nameCoord[0] + 25, theme.nameCoord[1] - 10];
  const classCoord = [theme.classCoord[0] + 25, theme.classCoord[1] - 10];
  const timezoneCoord = [theme.timezoneCoord[0] + 25, theme.timezoneCoord[1] - 10];

  ctx.fillText(entity.name, nameCoord[0], nameCoord[1]);
  if (entity.role === "student") {
    ctx.fillText(entity.className || "", classCoord[0], classCoord[1]);
  }
  ctx.fillText(`${timezoneLabel} Time`, timezoneCoord[0], timezoneCoord[1]);

  // Every distinct time actually in use becomes its own row — this is what
  // fixes p26's fixed-8-slot limitation (any time can now show up).
  const distinctTimes = [...new Set(entries.map((e) => e.time))].sort();
  const rowTimes = distinctTimes.length ? distinctTimes : FALLBACK_TIMES;
  const numRows = rowTimes.length;
  const timeToRow = Object.fromEntries(rowTimes.map((t, i) => [t, i]));

  // Paint over the old baked-in time column + cells, then redraw fresh.
  ctx.fillStyle = "#3d1760";
  ctx.fillRect(ROW_AREA.left, ROW_AREA.top, ROW_AREA.right - ROW_AREA.left, ROW_AREA.bottom - ROW_AREA.top);

  const rowHeight = (ROW_AREA.bottom - ROW_AREA.top) / numRows;
  const timeFontSize = Math.max(12, Math.min(22, rowHeight * 0.3));
  const cellFontSize = Math.max(11, Math.min(25, rowHeight * 0.28));
  const dividerHeight = Math.max(1, Math.min(3, rowHeight * 0.03));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let row = 0; row < numRows; row++) {
    const rowTop = ROW_AREA.top + row * rowHeight;
    const rowCenterY = rowTop + rowHeight / 2;

    ctx.fillStyle = "#c03fa9";
    ctx.fillRect(TIME_COL_LEFT, rowTop, TIME_COL_WIDTH, rowHeight - dividerHeight);
    ctx.fillStyle = "#ffde59";
    ctx.font = `${timeFontSize}px Roboto`;
    ctx.fillText(to12Hour(rowTimes[row]), TIME_COL_LEFT + TIME_COL_WIDTH / 2, rowCenterY);

    for (let col = 0; col < NUM_COLS; col++) {
      ctx.fillStyle = "#f9f5ff";
      ctx.fillRect(colLeft(col), rowTop, GRID_COL_WIDTH, rowHeight - dividerHeight);
    }
  }

  ctx.fillStyle = "black";
  ctx.font = `${cellFontSize}px Roboto`;

  for (const entry of entries) {
    const { day, time } = entry;
    if (!(day in DAY_TO_COL) || !(time in timeToRow)) continue;
    const row = timeToRow[time];
    const col = DAY_TO_COL[day];
    const centerX = colLeft(col) + GRID_COL_WIDTH / 2;
    const centerY = ROW_AREA.top + row * rowHeight + (rowHeight - dividerHeight) / 2;

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
