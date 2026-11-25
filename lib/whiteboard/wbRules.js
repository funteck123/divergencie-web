// 25 Nov 2026 (TKT-0443): the DC Whiteboard. These are the pure rules, kept apart from the storage so they are tested without a database.
// The editor is a copy of the owner's MSAWhiteboard (study hub repo, study/pages/whiteboard.html); its save rules are ported from study/server/serve_pdf.py.

export const WB_ID = /^[A-Za-z0-9_-]{1,40}$/;
export const WB_ASSET_ID = /^[0-9a-f]{64}\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|mov|m4v|ogg|mp3|wav|pdf)$/;
export const WB_ASSET_TYPES = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/x-m4v", ogg: "audio/ogg", mp3: "audio/mpeg", wav: "audio/wav", pdf: "application/pdf",
};
/** A function on Vercel takes a request body of at most 4.5 MB, so a board or file above this is saved in the browser only. */
export const MAX_BODY_BYTES = 4_400_000;
/** A session id is a schedule item id such as SCH-0123, or anything that is plain letters, digits, dash and underscore. */
export const SESSION_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** The one line of a board shown in the list. */
export const indexEntry = (board, sessionId) => ({ id: board.id, name: String(board.name || "Untitled").slice(0, 120), updated: Number(board.updated) || 0, n: Array.isArray(board.objs) ? board.objs.length : 0, ...(sessionId ? { sessionId } : {}) });

/**
 * What to do with a board that arrives for saving, given the copy already stored (or null).
 * "ok": store it. "refuse": the new copy has under half the old copy's marks (and the old one had 10 or more) and was not forced: keep the old one, keep the
 * refused copy aside, answer 409. "shrunk": the same but forced on purpose: store it and keep the bigger copy as a backup so nothing is lost.
 */
export function decideSave(oldBoard, nextBoard, force) {
  const old = Array.isArray(oldBoard?.objs) ? oldBoard.objs.length : 0;
  const now = Array.isArray(nextBoard?.objs) ? nextBoard.objs.length : 0;
  const shrink = old >= 10 && now < 0.5 * old;
  return shrink ? (force ? "shrunk" : "refuse") : "ok";
}

/** A board is accepted only when it names the id in the address and carries a list of objects. */
export const validBoard = (id, b) => !!b && typeof b === "object" && b.id === id && Array.isArray(b.objs);

export const storagePaths = (userId) => ({
  board: (id) => `u/${userId}/boards/${id}.json`,
  index: `u/${userId}/index.json`,
  asset: (id) => `u/${userId}/assets/${id}`,
  trash: (id, stamp) => `u/${userId}/trash/${id}_${stamp}.json`,
  backup: (kind, id, stamp) => `u/${userId}/trash/${id}.${kind}_${stamp}.json`,
});

/** Puts an entry into the index (replacing the same id), newest first. */
export const upsertIndex = (list, entry) => [entry, ...list.filter((e) => e.id !== entry.id)].sort((a, b) => b.updated - a.updated);
export const removeFromIndex = (list, id) => list.filter((e) => e.id !== id);
