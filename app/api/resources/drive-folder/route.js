import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { extractDriveFolderId, listDriveFolderFiles } from "@/lib/googleDrive";

// Same auth level as the Worksheets page itself (any authenticated
// account) — this only ever lists a folder the account can already reach
// directly via the existing "Access Worksheets" link.
export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const link = new URL(req.url).searchParams.get("link") || "";
  const folderId = extractDriveFolderId(link);
  if (!folderId) {
    return NextResponse.json({ error: "Not a recognizable Google Drive folder link." }, { status: 400 });
  }

  try {
    const files = await listDriveFolderFiles(folderId);
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
