// Pure rules for the same-origin proxy to the Syllabus Viewer service (app/api/syllabus/[...path]/route.js).
// Kept out of the route so they can be tested without a server.

const GET_ROUTES = new Set(["syllabi", "progress", "leaderboard", "images"]);

/**
 * Where does a browser path go upstream? `segments` is the part after /api/syllabus/.
 * Returns { path, binary } or null when the path is not one the viewer serves or tries to climb out of it.
 */
export function upstreamTarget(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (segments.some((s) => !s || s === "." || s === ".." || /[\\\0]/.test(s))) return null;
  if (!GET_ROUTES.has(segments[0])) return null;
  const rest = segments.map(encodeURIComponent).join("/");
  return segments[0] === "images" ? { path: `/${rest}`, binary: true } : { path: `/api/${rest}`, binary: false };
}

/** A person may read their own progress. Management may read anyone's. */
export function scopedAccount(session, requested) {
  if (session.userType === "Management" && requested) return String(requested);
  return session.userId;
}

/** The body sent upstream when a topic is ticked or unticked: the account always comes from the session, never from the browser. */
export function topicCompleteBody(session, body) {
  const { subject, nodeKey, nodeLabel, completed, accountName } = body || {};
  if (typeof subject !== "string" || !subject || (typeof nodeKey !== "string" && typeof nodeKey !== "number") || nodeKey === "") return null;
  return {
    accountId: session.userId,
    accountName: typeof accountName === "string" ? accountName.slice(0, 120) : "",
    subject,
    nodeKey: String(nodeKey),
    nodeLabel: typeof nodeLabel === "string" ? nodeLabel.slice(0, 300) : "",
    completed: completed === false ? false : true,
  };
}
