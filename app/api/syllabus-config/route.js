import { NextResponse } from "next/server";
import { requireSession, requireManagement } from "@/lib/authz";
import { getSyllabusViewerUrl, setSyllabusViewerUrl } from "@/lib/mcqConfig";

// Syllabus Viewer's own Cloudflare tunnel URL, moved out of a hardcoded
// const in components/ResourcesSection.jsx (2026-09-14) into the same
// Supabase-backed config MCQ's extraction URL already uses -- a tunnel
// restart used to need a real code push + redeploy just to update one
// link; now it's a config write, same as MCQ's.
export async function GET(req) {
  const { error } = requireSession(req);
  if (error) return error;

  const url = await getSyllabusViewerUrl();
  return NextResponse.json({ url });
}

// body: { url: string }. Same shape as PATCH /api/mcq-config; used by
// scripts/ops/question-solver-supervisor.sh to publish a fresh tunnel URL
// after every restart (TKT-0262).
export async function PATCH(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { url } = await req.json();
  if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url must be a non-empty http(s) URL." }, { status: 400 });
  }
  await setSyllabusViewerUrl(url.replace(/\/+$/, ""));
  return NextResponse.json({ url });
}
