import { getOAuthAccessToken } from "./googleAuth";
import { extractDriveFolderId } from "./googleDrive";

// TKT-0158: duplicates the real, already-confirmed-consistent DC Timesheet
// Template (see study/agent-notes/20-google-drive-folders-and-credentials-
// 2026-08-30.md -- Manya's, Steve's, and this blank template all match
// exactly), fills in the header cells, renames it, and hands back the link.
// Deliberately does NOT touch the DivergenCIE web app or any student
// account -- that wiring is a separate, later step. This module's whole job
// is: input in, a new real Google Sheet out.
const TEMPLATE_FILE_ID = "1vzRiXAmWeYTTN5pQCcy7WiQeiG35jqNaqEGKnHlL-KU";
const SHEET_TAB_NAME = "Timesheet";

// Real cell positions, confirmed by reading the template's actual grid via
// the Sheets API (not assumed from the rendered screenshot):
//   Row 3 (A1): "Course" label in B3, its value goes in C3.
//   Row 7 (A1): the real Name/Batch/Currency/Rate/Link values, under the
//   Row 6 label row -- B7=Name, C7=Batch, D7=Currency, E7=Rate, F7=Link.
const CELL_RANGES = {
  course: `${SHEET_TAB_NAME}!C3`,
  headerRow: `${SHEET_TAB_NAME}!B7:F7`,
};

function folderId() {
  const url = process.env.GDRIVE_TIMESHEET_FOLDER_URL;
  if (!url) throw new Error("GDRIVE_TIMESHEET_FOLDER_URL is not configured.");
  const id = extractDriveFolderId(url);
  if (!id) throw new Error(`Could not extract a folder id from GDRIVE_TIMESHEET_FOLDER_URL: ${url}`);
  return id;
}

// Finds an existing Timesheet already tagged with this exact accountId, via
// Drive's appProperties -- a small hidden key/value store Drive keeps on
// every file, invisible in the UI, queryable in a search `q`. This is the
// real anti-duplicate check: without it, clicking Generate twice for the
// same account (impatience, a double-click, re-running a backfill script)
// would silently create a second real Sheet with no way to tell it apart
// from the first except by opening both.
async function findExistingByAccountId(accessToken, accountId) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    `'${folderId()}' in parents and trashed = false and appProperties has { key='accountId' and value='${accountId}' }`
  );
  url.searchParams.set("fields", "files(id, name)");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`createTimesheet: existing-file lookup failed: ${JSON.stringify(data)}`);
  return data.files?.[0] || null;
}

// input: { name, batch?, currency?, rate?, link?, course?, accountId? } --
// name is the only required field, matching the template's own required
// column (Batch/Currency/Rate/Link/Course are all real optional fields on
// the template). accountId is optional but strongly recommended whenever a
// real account is calling this (the admin button always passes the
// student's UserID) -- when given, this becomes idempotent: a second call
// with the same accountId returns the SAME file instead of creating a
// duplicate. Returns { fileId, fileName, url, alreadyExisted }.
export async function createTimesheet(input) {
  const { name, batch = "", currency = "", rate = "", link = "", course = "", accountId = "" } = input;
  if (!name || !name.trim()) throw new Error("createTimesheet: name is required.");

  const accessToken = await getOAuthAccessToken();

  if (accountId) {
    const existing = await findExistingByAccountId(accessToken, accountId);
    if (existing) {
      return { fileId: existing.id, fileName: existing.name, url: `https://docs.google.com/spreadsheets/d/${existing.id}/edit`, alreadyExisted: true };
    }
  }

  // Real naming convention found across the existing 160 real timesheets:
  // "DC Timesheet - <Batch> <Name>" when a batch is known (e.g. "DC
  // Timesheet - B14 Manya Agarwal"), matching the more complete/current
  // pattern rather than the older batch-less one.
  const fileName = `DC Timesheet - ${batch ? `${batch} ` : ""}${name.trim()}`;

  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${TEMPLATE_FILE_ID}/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: fileName,
      parents: [folderId()],
      // Hidden metadata, not a visible cell -- stamped at creation time so
      // the dedup lookup above never has to trust anything about the
      // sheet's own content (which the account owner or a teacher could
      // freely edit/clear without realizing it was load-bearing).
      appProperties: accountId ? { accountId } : undefined,
    }),
  });
  const copyData = await copyRes.json();
  if (!copyRes.ok) throw new Error(`createTimesheet: Drive copy failed: ${JSON.stringify(copyData)}`);
  const fileId = copyData.id;

  const data = [{ range: CELL_RANGES.headerRow, values: [[name.trim(), batch, currency, rate, link]] }];
  if (course) data.push({ range: CELL_RANGES.course, values: [[course]] });

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    }
  );
  const updateData = await updateRes.json();
  if (!updateRes.ok) throw new Error(`createTimesheet: Sheets cell update failed: ${JSON.stringify(updateData)}`);

  return { fileId, fileName, url: `https://docs.google.com/spreadsheets/d/${fileId}/edit`, alreadyExisted: false };
}
