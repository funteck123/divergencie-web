import { createClient } from "@supabase/supabase-js";

// Own dedicated table/client, not part of lib/db-supabase.js's
// COLLECTIONS/read_full_db() aggregate -- same reasoning as
// lib/storage.js's payment-proofs bucket, see
// data/tmp/migration_mcq_attempts_and_config.sql for why.
const supabase = createClient(process.env.V7_SUPABASE_URL, process.env.V7_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = "mcqconfig";
const ROW_ID = "GLOBAL";

// The mcq-digitizer extraction service (prototypes/mcq-digitizer/server.mjs)
// runs on an always-on machine reached through a Cloudflare tunnel whose URL
// changes on restart -- Management updates it here in one place, and
// app/api/mcq/[...path]/route.js reads it live (no redeploy) on every
// proxied request.
export async function getMcqExtractionUrl() {
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
  if (error) throw new Error(`Could not read MCQ config: ${error.message}`);
  return data?.data?.url || null;
}

export async function setMcqExtractionUrl(url) {
  const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: { url }, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save MCQ config: ${error.message}`);
}
