import path from "path";
import { createCanvas, loadImage, registerFont } from "canvas";

// Ported 1:1 from p26 (backend/visualization/schedule_maker.py,
// backend/classes/timetable.py, backend/utils/utils.py). Same fixed grid,
// same template PNGs, same pixel coordinates, same fonts/sizes. Entries whose
// Day/Time don't exactly match the fixed grid below are silently skipped —
// that's p26's own behaviour, kept intentionally for exact replication.

const ASSETS_DIR = path.join(process.cwd(), "lib", "schedule-image", "assets");
const FONT_PATH = path.join(ASSETS_DIR, "Roboto.ttf");
registerFont(FONT_PATH, { family: "Roboto" });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_TO_COL = Object.fromEntries(DAYS.map((d, i) => [d, i]));

const TIMES = ["16:30", "17:30", "18:30", "19:30", "20:30", "21:30", "22:30", "23:30"];
const TIME_TO_ROW = Object.fromEntries(TIMES.map((t, i) => [t, i]));

const THEMES = {
  teacher: {
    topLeft: [279, 312],
    firstBoxBottomRight: [495, 412],
    bottomRight: [1965, 1357],
    numRows: 8,
    numCols: 7,
    file: path.join(ASSETS_DIR, "teacher-ist.png"),
    nameCoord: [639, 105],
    classCoord: [0, 0],
    timezoneCoord: [1684, 105],
  },
  student_India: {
    topLeft: [279, 312],
    firstBoxBottomRight: [495, 682],
    bottomRight: [1965, 1357],
    numRows: 6,
    numCols: 7,
    file: path.join(ASSETS_DIR, "student-ist.png"),
    nameCoord: [1422, 125],
    classCoord: [1422, 199],
    timezoneCoord: [1422, 256],
  },
  student_Saudi: {
    topLeft: [279, 312],
    firstBoxBottomRight: [495, 682],
    bottomRight: [1965, 1357],
    numRows: 6,
    numCols: 7,
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

// utils.get_cell_center, ported verbatim.
function getCellCenter(topLeft, firstBoxBottomRight, bottomRight, numRows, numCols, row, col) {
  const boxWidth = firstBoxBottomRight[0] - topLeft[0];
  const boxHeight = firstBoxBottomRight[1] - topLeft[1];

  const paddingX = numCols > 1 ? (bottomRight[0] - topLeft[0] - boxWidth * numCols) / (numCols - 1) : 0;
  const paddingY = numRows > 1 ? (bottomRight[1] - topLeft[1] - boxHeight * numRows) / (numRows - 1) : 0;

  const centerX = topLeft[0] + col * (boxWidth + paddingX) + boxWidth / 2;
  const centerY = topLeft[1] + row * (boxHeight + paddingY) + boxHeight / 2;
  return [centerX, centerY];
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

  const cellFont = "25px Roboto";
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

  // PIL anchor="mm" (middle-middle) == canvas textAlign "center" + textBaseline "middle".
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  ctx.font = cellFont;

  for (const entry of entries) {
    const { day, time } = entry;
    if (!(day in DAY_TO_COL) || !(time in TIME_TO_ROW)) continue;
    const row = TIME_TO_ROW[time];
    const col = DAY_TO_COL[day];
    let [centerX, centerY] = getCellCenter(
      theme.topLeft, theme.firstBoxBottomRight, theme.bottomRight, theme.numRows, theme.numCols, row, col
    );

    const lines = wrapText(entry.name, 15);
    if (lines.length > 1) {
      let y = centerY - 25 / 2;
      for (const line of lines) {
        ctx.fillText(line, centerX, y);
        y += 25;
      }
    } else {
      ctx.fillText(lines[0], centerX, centerY);
    }
  }

  return canvas.toBuffer("image/png");
}
