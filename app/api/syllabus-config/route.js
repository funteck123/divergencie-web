import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { getSyllabusViewerUrl } from "@/lib/mcqConfig";

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
