import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { WB_ASSET_TYPES, decideSave, indexEntry, removeFromIndex, storagePaths, upsertIndex } from "./wbRules.js";

// 25 Nov 2026 (TKT-0443): DC Whiteboard boards live in a private Supabase Storage bucket, one folder per signed-in user: boards, a small index for the list,
// assets (pictures, video, audio, PDF) named by their checksum, and a trash folder for deleted boards and for the bigger copy when a board is shrunk on purpose.
// No database table is needed. Same storage account as the payment proofs (lib/storage.js).

const BUCKET = "whiteboards";
let sb;
const client = () => (sb ??= createClient(process.env.V7_SUPABASE_URL, process.env.V7_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }));
let ready;
const ensureBucket = () => (ready ??= (async () => {
  const c = client();
  const { data } = await c.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await c.storage.createBucket(BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) { ready = undefined; throw new Error(`Could not prepare the whiteboard storage: ${error.message}`); }
})());

const stamp = () => new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15);

async function readJson(path) {
  await ensureBucket();
  const { data, error } = await client().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  try { return JSON.parse(await data.text()); } catch { return null; }
}
async function writeJson(path, value) {
  await ensureBucket();
  const { error } = await client().storage.from(BUCKET).upload(path, Buffer.from(JSON.stringify(value)), { contentType: "application/json", upsert: true });
  if (error) throw new Error(`Could not save: ${error.message}`);
}

export async function listBoards(userId, sessionId) {
  const list = (await readJson(storagePaths(userId).index)) ?? [];
  return sessionId ? list.filter((e) => e.sessionId === sessionId) : list;
}

export const getBoard = (userId, id) => readJson(storagePaths(userId).board(id));

/** Returns { status: 200 } when stored, { status: 409 } when a much smaller copy was refused (it is kept aside, the stored board is untouched). */
export async function saveBoard(userId, id, board, { force = false, sessionId } = {}) {
  const p = storagePaths(userId);
  const old = await readJson(p.board(id));
  const verdict = decideSave(old, board, force);
  if (verdict === "refuse") { await writeJson(p.backup("refused", id, stamp()), board); return { status: 409 }; }
  if (verdict === "shrunk") await writeJson(p.backup("shrunk", id, stamp()), old);
  await writeJson(p.board(id), board);
  const index = (await readJson(p.index)) ?? [];
  const keep = sessionId ?? index.find((e) => e.id === id)?.sessionId;   // a board keeps its session link when later saves do not name one
  await writeJson(p.index, upsertIndex(index, indexEntry(board, keep)));
  return { status: 200 };
}

export async function deleteBoard(userId, id) {
  const p = storagePaths(userId);
  const old = await readJson(p.board(id));
  if (old) {
    await writeJson(p.trash(id, stamp()), old);
    await client().storage.from(BUCKET).remove([p.board(id)]);
  }
  await writeJson(p.index, removeFromIndex((await readJson(p.index)) ?? [], id));
}

export async function putAsset(userId, ext, bytes) {
  if (!WB_ASSET_TYPES[ext]) throw new Error("type not allowed");
  await ensureBucket();
  const id = `${crypto.createHash("sha256").update(bytes).digest("hex")}.${ext}`;
  const { error } = await client().storage.from(BUCKET).upload(storagePaths(userId).asset(id), bytes, { contentType: WB_ASSET_TYPES[ext], upsert: true });
  if (error) throw new Error(`Could not store the file: ${error.message}`);
  return id;
}

export async function getAsset(userId, id) {
  await ensureBucket();
  const { data, error } = await client().storage.from(BUCKET).download(storagePaths(userId).asset(id));
  if (error || !data) return null;
  return { bytes: Buffer.from(await data.arrayBuffer()), type: WB_ASSET_TYPES[id.split(".").pop()] };
}

/** Test cleanup only: removes everything stored for one user id. */
export async function wipeUserForTests(userId) {
  await ensureBucket();
  const walk = async (dir) => {
    const { data } = await client().storage.from(BUCKET).list(dir, { limit: 1000 });
    const files = [];
    for (const f of data ?? []) { if (f.id) files.push(`${dir}/${f.name}`); else files.push(...(await walk(`${dir}/${f.name}`))); }
    return files;
  };
  const all = await walk(`u/${userId}`);
  if (all.length) await client().storage.from(BUCKET).remove(all);
  return all.length;
}
