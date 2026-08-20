// Read-only listing of a Google Drive folder's direct contents, via the
// Drive API v3 REST endpoint directly (no googleapis SDK — one GET request
// doesn't need it). Requires GOOGLE_DRIVE_API_KEY, which only works against
// folders shared "Anyone with the link" — same sharing assumption the
// existing WorksheetsLink/RecordingsLink "Access" buttons already make
// (they open the raw link directly, no Google auth step in this app).

// Accepts any of Drive's folder-link shapes:
//   https://drive.google.com/drive/folders/<id>
//   https://drive.google.com/drive/u/0/folders/<id>?usp=sharing
//   https://drive.google.com/open?id=<id>
export function extractDriveFolderId(link) {
  if (!link) return null;
  const folderMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

// Folders first, then alphabetical — nested folders link straight to Drive's
// own folder view (no in-app drill-down), everything else opens its own
// webViewLink directly.
export async function listDriveFolderFiles(folderId) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_DRIVE_API_KEY is not configured.");

  const files = [];
  let pageToken = "";
  do {
    const url = new URL(DRIVE_FILES_URL);
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
    url.searchParams.set("fields", "nextPageToken, files(id, name, mimeType, webViewLink, iconLink)");
    url.searchParams.set("orderBy", "folder,name");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Google Drive API error (${res.status}).`);
    }
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return files;
}
