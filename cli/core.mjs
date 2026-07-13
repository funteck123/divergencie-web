// Shared core for both the CLI (cli/dcp1.mjs) and the MCP server
// (mcp/server.mjs) — auth config storage + the one HTTP client both talk
// through. Kept dependency-free (Node's global fetch, no npm packages) so
// this file works identically whether it's invoked from a terminal or from
// an MCP tool call.
import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".dcp1");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

// mode 0o600: the API key inside is a bearer credential for whichever
// account minted it — same sensitivity class as a password, so this file
// should never be group/world-readable.
export function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function clearConfig() {
  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
    // already gone — logout is idempotent
  }
}

// Env vars always win over the saved config file, so a script/CI/MCP host
// can run without ever touching ~/.dcp1/config.json.
export function resolveAuth() {
  const config = loadConfig();
  const baseUrl = (process.env.DCP1_API_URL || config.baseUrl || "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.DCP1_API_KEY || config.token;
  return { baseUrl, token, config };
}

// JSON request/response — the shape every route in app/api/** actually
// uses (see dcp1-backend-map-v7.md). Throws Error(message) on any non-2xx
// response, message taken from the route's own { error } body when present.
export async function apiRequest(method, urlPath, body) {
  const { baseUrl, token } = resolveAuth();
  if (!token) {
    throw new Error(
      "Not logged in. Run `dcp1 login <username> <password>` first, or set DCP1_API_KEY + DCP1_API_URL."
    );
  }
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${urlPath} failed (HTTP ${res.status})`);
  return data;
}

// For the two binary-response routes (invoice/paycheck PDFs, schedule PNG)
// — returns a Buffer instead of parsed JSON.
export async function apiRequestBinary(urlPath) {
  const { baseUrl, token } = resolveAuth();
  if (!token) {
    throw new Error(
      "Not logged in. Run `dcp1 login <username> <password>` first, or set DCP1_API_KEY + DCP1_API_URL."
    );
  }
  const res = await fetch(`${baseUrl}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      message = JSON.parse(text).error || text;
    } catch {
      // not JSON — use the raw text as-is
    }
    throw new Error(message || `GET ${urlPath} failed (HTTP ${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Bootstraps an API key from a username/password — used once by `dcp1
// login`. Does a real POST /api/login (gets a session cookie), immediately
// uses that cookie for one POST /api/apikeys call (self-service — see
// app/api/apikeys/route.js's requireSelfOrManagement gate) to mint a
// long-lived Bearer token, then discards the cookie entirely. Every
// subsequent CLI/MCP call uses only the minted token.
export async function loginAndMintKey(baseUrl, username, password, { label, expiresInDays } = {}) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const loginRes = await fetch(`${cleanBaseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(loginData.error || `Login failed (HTTP ${loginRes.status}).`);

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) throw new Error("Login succeeded but the server didn't return a session cookie.");
  const cookiePair = setCookie.split(";")[0];

  const keyRes = await fetch(`${cleanBaseUrl}/api/apikeys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookiePair },
    body: JSON.stringify({
      userId: loginData.user.UserID,
      label: label || `CLI (${os.hostname()})`,
      ...(expiresInDays !== undefined ? { expiresInDays } : {}),
    }),
  });
  const keyData = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok) throw new Error(keyData.error || `Failed to mint API key (HTTP ${keyRes.status}).`);

  saveConfig({
    baseUrl: cleanBaseUrl,
    token: keyData.token,
    apiKeyId: keyData.apiKeyId,
    userId: keyData.userId,
    userType: keyData.userType,
  });

  return keyData;
}
