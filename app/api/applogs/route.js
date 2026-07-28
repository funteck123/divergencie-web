import { NextResponse } from "next/server";
import { supabase } from "@/lib/db-supabase";
import { requireManagement } from "@/lib/authz";

// Same pattern as app/api/auditlog/route.js — reads directly from Supabase,
// bypassing the generic readDB() aggregate on purpose.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;
  const level = searchParams.get("level");
  const source = searchParams.get("source");

  let query = supabase
    .from("applogs")
    .select("data", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (level) query = query.eq("data->>Level", level);
  if (source) query = query.eq("data->>Source", source);

  const { data, error: dbError, count } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ entries: (data || []).map((r) => r.data), total: count ?? 0, limit, offset });
}
