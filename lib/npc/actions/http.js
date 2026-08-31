// Shared HTTP plumbing for every NPC action. No LLM, no direct DB access --
// every call here is a real HTTP request to this app's own /api/** routes,
// same as a real user's browser or the dcp1 CLI would make.

export async function callApi(ctx, method, path, body) {
  const headers = { "Content-Type": "application/json" };
  // /api/register (used by applyRegistration in self.js) is the one public,
  // pre-account route in this whole action library -- ctx.apiKey is
  // legitimately undefined there, an applicant NPC doesn't have one yet.
  if (ctx.apiKey) headers.Authorization = `Bearer ${ctx.apiKey}`;
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, body: json };
}

// multipart/form-data variant, for the one route in this library that needs
// it (POST /api/invoices/mark-paid, a real file attachment required by that
// route, not optional).
export async function callApiForm(ctx, path, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    method: "POST",
    headers: ctx.apiKey ? { Authorization: `Bearer ${ctx.apiKey}` } : {},
    body: form,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, body: json };
}

// /swe review, MEDIUM finding: the standard "not ok -> report an issue,
// don't throw" shape used to be hand-written near-identically in ~14
// action functions. Factored out here for the actions that follow that
// exact shape; logAttendance, submitFeedback, reviewRegistrations, and
// reviewScheduleRequests have genuinely different error handling (a
// specific "already logged" carve-out, a loop over multiple sub-requests)
// and are left calling callApi directly rather than being forced through
// this wrapper.
export async function callChecked(ctx, method, path, body, actionName) {
  const res = await callApi(ctx, method, path, body);
  if (!res.ok) {
    return {
      failed: true,
      result: {
        flags: { issueFound: true, issueDetail: `${method} ${path} failed (${res.status}): ${res.body?.error}` },
        log: `${actionName}: error ${res.status}`,
      },
    };
  }
  return { failed: false, body: res.body };
}

// Mints a real API key from a username/password without touching
// ~/.dcp1/config.json -- cli/core.mjs's loginAndMintKey() does that as a
// side effect (it's meant for a single human CLI session), which would
// clobber the operator's own saved session every time an NPC claims its
// account. Same two real HTTP calls (login for a cookie, then apikeys
// POST using that cookie), just without the save.
export async function mintApiKeyFromCredentials(baseUrl, username, password, label) {
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(loginData.error || `Login failed (HTTP ${loginRes.status}).`);
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error("Login succeeded but no session cookie came back.");

  const keyRes = await fetch(`${baseUrl}/api/apikeys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ userId: loginData.user.UserID, label: label || "npc-sim" }),
  });
  const keyData = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok) throw new Error(keyData.error || `Failed to mint API key (HTTP ${keyRes.status}).`);
  return { userId: keyData.userId, apiKey: keyData.token };
}

export function evalCondition(condition, flags) {
  if (!condition) return true;
  const m = condition.match(/^\s*(\w+)\s*(==|!=)\s*'?([\w.-]+)'?\s*$/);
  if (!m) throw new Error(`Unsupported condition syntax: "${condition}"`);
  const [, key, op, rawValue] = m;
  const actual = flags[key];
  const expected = rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
  return op === "==" ? actual === expected : actual !== expected;
}
