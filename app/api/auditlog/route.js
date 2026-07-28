import { NextResponse } from "next/server";
import { supabase } from "@/lib/db-supabase";
import { requireManagement } from "@/lib/authz";

// Reads directly from Supabase, NOT via lib/db.js's readDB() — see the
// comment on `supabase` in lib/db-supabase.js for why this table is kept
// out of the generic read_full_db() aggregate every other collection uses.
// Paginated (default 50/page) since this table has no retention cutoff and
// is expected to grow indefinitely.
export async function GET(req) {
  const { error } = requireManagement(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;
  const actorUserId = searchParams.get("actorUserId");
  const entityType = searchParams.get("entityType");

  let query = supabase
    .from("auditlog")
    .select("data", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (actorUserId) query = query.eq("data->>ActorUserID", actorUserId);
  if (entityType) query = query.eq("data->>EntityType", entityType);

  const { data, error: dbError, count } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ entries: (data || []).map((r) => r.data), total: count ?? 0, limit, offset });
}
