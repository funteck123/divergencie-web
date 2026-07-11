import { createClient } from "@supabase/supabase-js";

// Payment-proof attachments (required when a student/parent marks an invoice
// paid) live in a private Supabase Storage bucket — Vercel's serverless
// filesystem doesn't persist local writes, same reason the JSON-file DB
// moved to Supabase tables.
const supabase = createClient(process.env.V7_SUPABASE_URL, process.env.V7_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "payment-proofs";

export async function uploadPaymentProof(invoiceId, file) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${invoiceId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function signedProofUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Could not create signed URL: ${error.message}`);
  return data.signedUrl;
}
