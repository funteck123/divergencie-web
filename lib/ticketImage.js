import sharp from "sharp";

// One picture per ticket (a screenshot of the screen, or a photo the sender attached), kept small: whatever arrives is decoded, turned upright, scaled down to at most
// 1280 px on its longest side and saved as a JPEG at quality 60 (a full screen is about 60 to 120 KB). It lives in the app's private storage bucket under a fixed
// name, tickets/<TicketID>.jpg, so the ticket record itself only carries a flag and nobody can open the file without a short-lived signed link.
const BUCKET = "payment-proofs"; // the existing private bucket (lib/storage.js); ticket pictures sit in its tickets/ folder
export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 60;
export const MAX_INPUT_BYTES = 6 * 1024 * 1024;
export const ticketImagePath = (ticketId) => `tickets/${ticketId}.jpg`;

/**
 * "data:image/jpeg;base64,..." -> Buffer, or null. Only JPEG, PNG and WebP, the first bytes must match the type named, at most 6 MB.
 * (The picture is decoded again by compressImage, so a file that only pretends to be an image fails there.)
 */
export function parseImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX_INPUT_BYTES) return null;
  const ok =
    (m[1] === "jpeg" && buf[0] === 0xff && buf[1] === 0xd8) ||
    (m[1] === "png" && buf[0] === 0x89 && buf[1] === 0x50) ||
    (m[1] === "webp" && buf.subarray(8, 12).toString() === "WEBP");
  return ok ? buf : null;
}

/** Decode, upright, scale down (never up), flatten transparency onto white, re-encode as a small JPEG. Metadata such as location in a photo is dropped. Throws if not an image. */
export async function compressImage(buf) {
  return sharp(buf)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

// The storage client is loaded only when a picture is saved or opened, so the pure functions above can be tested without database settings.
async function storage() {
  const { supabase } = await import("./db-supabase.js");
  return supabase.storage.from(BUCKET);
}

export async function saveTicketImage(ticketId, jpeg) {
  const { error } = await (await storage()).upload(ticketImagePath(ticketId), jpeg, { contentType: "image/jpeg", upsert: true });
  return !error;
}

export async function ticketImageUrl(ticketId, seconds = 300) {
  const { data, error } = await (await storage()).createSignedUrl(ticketImagePath(ticketId), seconds);
  return error ? null : data?.signedUrl || null;
}
