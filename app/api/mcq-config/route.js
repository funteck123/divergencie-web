import { NextResponse } from "next/server";
import { requireSession, requireManagement } from "@/lib/authz";
import { getMcqExtractionUrl, setMcqExtractionUrl } from "@/lib/mcqConfig";

// GET is any authenticated session -- app/api/mcq/[...path]/route.js is the
// only real consumer, but exposing this read-only for any session mirrors
// GET /api/resource-toggles's reasoning (nothing sensitive in a URL that
// only proxies to a public-question-paper tool).
export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const url = await getMcqExtractionUrl();
  return NextResponse.json({ url });
}

// body: { url: string }
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { url } = await req.json();
  if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url must be a non-empty http(s) URL." }, { status: 400 });
  }
  await setMcqExtractionUrl(url.replace(/\/+$/, ""));
  return NextResponse.json({ url });
}
