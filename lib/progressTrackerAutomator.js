import { getOAuthAccessToken } from "./googleAuth";
import { extractDriveFolderId } from "./googleDrive";

// Mirrors lib/timesheetAutomator.js exactly -- duplicates the real DC
// Progress Tracker Template (cleaned/audited this session, see
// study/agent-notes/21-progress-tracker-formulas-and-real-tab-structure.md),
// fills in the header cells, renames it, hands back the link. Does not touch
// the DivergenCIE web app or any student account -- input in, a new real
// Google Sheet out.
const TEMPLATE_FILE_ID = "1RAHeRftKH2ajcGbmIomnxOeoQ7xCF0BxH5AfuH-2qlA";

// Real cell positions on the template's Study Plan tab: row 6 is the label
// row (Name/Batch/Currency/Rate/Link), row 7 is where the real values go --
// same row/column convention as the Timesheet Template's own B7:F7.
const CELL_RANGES = {
  headerRow: "'Study Plan'!B7:C7",
};

function folderId() {
  const url = process.env.GDRIVE_PROGRESS_TRACKER_FOLDER_URL;
  if (!url) throw new Error("GDRIVE_PROGRESS_TRACKER_FOLDER_URL is not configured.");
  const id = extractDriveFolderId(url);
  if (!id) throw new Error(`Could not extract a folder id from GDRIVE_PROGRESS_TRACKER_FOLDER_URL: ${url}`);
  return id;
}

// Same anti-duplicate pattern as findExistingByAccountId in
// timesheetAutomator.js -- see that file's comment for why this exists.
async function findExistingByAccountId(accessToken, accountId) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    `'${folderId()}' in parents and trashed = false and appProperties has { key='accountId' and value='${accountId}' }`
  );
  url.searchParams.set("fields", "files(id, name)");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`createProgressTracker: existing-file lookup failed: ${JSON.stringify(data)}`);
  return data.files?.[0] || null;
}

// input: { name, batch?, accountId? } -- name is the only required field.
// accountId makes this idempotent, same as createTimesheet. Returns
// { fileId, fileName, url, alreadyExisted }.
export async function createProgressTracker(input) {
  const { name, batch = "", accountId = "" } = input;
  if (!name || !name.trim()) throw new Error("createProgressTracker: name is required.");

  const accessToken = await getOAuthAccessToken();

  if (accountId) {
    const existing = await findExistingByAccountId(accessToken, accountId);
    if (existing) {
      return { fileId: existing.id, fileName: existing.name, url: `https://docs.google.com/spreadsheets/d/${existing.id}/edit`, alreadyExisted: true };
    }
  }

  // Same naming convention as the Timesheet Template's real files.
  const fileName = `DC Progress Tracker - ${batch ? `${batch} ` : ""}${name.trim()}`;

  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${TEMPLATE_FILE_ID}/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: fileName,
      parents: [folderId()],
      appProperties: accountId ? { accountId } : undefined,
    }),
  });
  const copyData = await copyRes.json();
  if (!copyRes.ok) throw new Error(`createProgressTracker: Drive copy failed: ${JSON.stringify(copyData)}`);
  const fileId = copyData.id;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [{ range: CELL_RANGES.headerRow, values: [[name.trim(), batch]] }],
      }),
    }
  );
  const updateData = await updateRes.json();
  if (!updateRes.ok) throw new Error(`createProgressTracker: Sheets cell update failed: ${JSON.stringify(updateData)}`);

  return { fileId, fileName, url: `https://docs.google.com/spreadsheets/d/${fileId}/edit`, alreadyExisted: false };
}
