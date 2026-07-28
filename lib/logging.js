import { randomUUID } from "crypto";
import { supabase } from "./db-supabase";

// Deliberately independent of nextId()/db.counters (see db-supabase.js's
// comment on `supabase`) — routing every log write through the full
// readDB()/writeDB() cycle just to mint an ID would reintroduce exactly the
// "every request pays for the log table" cost these two tables exist to
// avoid. IDs here just need to be unique, not sequential/human-friendly.
function logId(prefix) {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

// A logging failure must never break the request that triggered it — every
// error here is swallowed to console rather than thrown, so it's always
// safe to `await` these calls. Awaiting (rather than a true fire-and-forget)
// matters specifically because this runs on Vercel serverless: the function
// can freeze/exit right after the response is sent, which would silently
// drop an un-awaited write before it reaches Supabase.

// entityType/entityId identify what changed (e.g. "Service"/"SVC-0042");
// action is a short verb ("create"/"edit"/"delete"/"approve"/"reject");
// snapshot is an optional full copy of the record — required on delete
// (it's the only remaining record of what existed) and encouraged on edit
// (records before/after directly rather than making the log reader guess).
export async function logAudit({ actorUserId, action, entityType, entityId, summary, snapshot }) {
  try {
    const id = logId("AUD");
    const row = {
      id,
      data: {
        AuditID: id,
        Timestamp: new Date().toISOString(),
        ActorUserID: actorUserId || "",
        Action: action,
        EntityType: entityType,
        EntityID: entityId || "",
        Summary: summary || "",
        ...(snapshot !== undefined ? { Snapshot: snapshot } : {}),
      },
    };
    const { error } = await supabase.from("auditlog").insert(row);
    if (error) console.error("[audit] write failed:", error.message);
  } catch (e) {
    console.error("[audit] write failed:", e.message);
  }
}

// level: "error" | "warn" | "info". source: where this came from (e.g.
// "fxRates", "pdfDoc", "scheduleGen") so entries are filterable without
// parsing message text. context: any extra JSON-serializable detail.
export async function logAppEvent({ level, source, message, context }) {
  try {
    const id = logId("LOG");
    const row = {
      id,
      data: {
        LogID: id,
        Timestamp: new Date().toISOString(),
        Level: level || "error",
        Source: source || "",
        Message: message || "",
        ...(context !== undefined ? { Context: context } : {}),
      },
    };
    const { error } = await supabase.from("applogs").insert(row);
    if (error) console.error("[applog] write failed:", error.message);
  } catch (e) {
    console.error("[applog] write failed:", e.message);
  }
}
