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

// Same pattern as the MCQ extraction URL above, added 2026-09-14: the
// syllabus-digitizer prototype's own Cloudflare tunnel URL was previously
// hardcoded directly in components/ResourcesSection.jsx, meaning every
// tunnel restart needed a real code push + redeploy just to update a link.
// Moved here so Management can update it the same way (no redeploy), and
// so the health-check cron (app/api/cron/health-check/route.js) has one
// place to read both service URLs from.
const SYLLABUS_ROW_ID = "SYLLABUS_VIEWER";

export async function getSyllabusViewerUrl() {
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", SYLLABUS_ROW_ID).maybeSingle();
  if (error) throw new Error(`Could not read Syllabus Viewer config: ${error.message}`);
  return data?.data?.url || null;
}

export async function setSyllabusViewerUrl(url) {
  const { error } = await supabase.from(TABLE).upsert({ id: SYLLABUS_ROW_ID, data: { url }, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save Syllabus Viewer config: ${error.message}`);
}

// Health-check state (up/down per service), so the cron only emails on a
// state TRANSITION (recovered) or once per down day, never silently
// double-fires within the same check.
const HEALTH_ROW_ID = "HEALTH_STATE";

export async function getHealthState() {
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", HEALTH_ROW_ID).maybeSingle();
  if (error) throw new Error(`Could not read health-check state: ${error.message}`);
  return data?.data || null;
}

export async function setHealthState(state) {
  const { error } = await supabase.from(TABLE).upsert({ id: HEALTH_ROW_ID, data: state, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save health-check state: ${error.message}`);
}
