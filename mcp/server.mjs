#!/usr/bin/env node
// MCP server exposing the same app/api/** surface the CLI (cli/dcp1.mjs)
// wraps, so an MCP-aware agent (e.g. Claude) can operate the system as any
// user directly as tools, without shelling out. Shares cli/core.mjs's auth
// (DCP1_API_URL / DCP1_API_KEY env vars, or ~/.dcp1/config.json from a
// prior `dcp1 login`) and the exact same API routes — every authorization
// rule is identical to the web UI and the CLI, since it's the same
// lib/authz.js checks on the other end.
//
// Deliberately a SMALL set of generic tools rather than one narrow tool
// per endpoint (30+): dcp1_request is a full-parity passthrough to any
// app/api/** route, dcp1_api_catalog documents what's available so an
// agent can discover the surface without needing 30+ hand-authored tool
// schemas, and dcp1_whoami/dcp1_login round out identity management.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiRequest, apiRequestBinary, loginAndMintKey, loadConfig, resolveAuth } from "../cli/core.mjs";

const API_CATALOG = `
Every path below is relative to the configured base URL. Body shapes match
exactly what app/api/**/route.js expects (see dcp1-backend-map-v7.md for
full detail) — pass the "body" argument to dcp1_request as a plain object,
omit it for GET/DELETE-with-no-body routes.

Auth / identity
  GET  /api/me?userId=<id>                 — full dashboard bundle for a user
  POST /api/apikeys   {userId, label?, expiresInDays?}   — mint a key (self or Management)
  GET  /api/apikeys                        — list issued keys (Management only)
  DELETE /api/apikeys {apiKeyId}           — remove a key's bookkeeping record

Accounts (Management only unless noted)
  GET  /api/users
  POST /api/users     {userType, name, ...type-specific fields}
  PATCH /api/users    {userId, ...fields to change}
  POST /api/convert   {accountId}          — converts a pending account to its final type

Services / Billing config (Management only for writes; GET is any session)
  GET  /api/services
  POST /api/services  {name, type, group, rates:[{currency,rate,description?,billingType?}], occurrences:[...], ...}
  PATCH /api/services {serviceId, ...same shape as POST}
  GET  /api/enrollments
  POST /api/enrollments {userId, serviceId, rateId?, startDate?, endDate?}
  PATCH /api/enrollments {enrolmentId, ...fields}
  DELETE /api/enrollments {enrolmentId}

Schedule / Booking
  GET  /api/schedule                       — any session
  POST /api/schedule  {serviceType, serviceId, date, time, duration, facilitator}  — Management only
  POST /api/schedule/pick {scheduleId, userId, type}  — self or Management
  GET  /api/schedule/requests               — Management only
  PATCH /api/schedule/requests {type, id, action: "approve"|"reject"}  — Management only
  GET  /api/schedule/image?userId=<id>&download=1  — binary PNG (self/parent/Management)

Trial / Interview flows
  POST /api/trial-feedback  {trialId, feedback}          — self or Management
  POST /api/trial-enroll    {trialId}                    — Management only
  POST /api/interview-task  {interviewId, link}          — self or Management
  POST /api/interview-offer {interviewId, action: "send"|"accept"|"waitlist"|"reject"|"unsend", feedback?, offerLetterLink?}

Attendance
  GET  /api/attendance                      — Management only
  POST /api/attendance {scheduleItemId, userId, status, loggedDuration}  — self or Management

Billing (Invoices = Students, Paychecks = Staff/Teacher/Ambassador)
  GET  /api/invoices                        — Management only
  POST /api/invoices  {action:"generate", year, month}  or  {action:"manual", studentId, serviceId, year, month, amount}
  PATCH /api/invoices {invoiceId, ...fields}  — mixed: studentPaidFlag is self/parent, rest Management
  DELETE /api/invoices {invoiceId}
  GET  /api/invoices/pdf?invoiceId=<id>     — binary PDF (self/parent/Management)
  GET  /api/paychecks  · POST · PATCH · DELETE   — same shape, staffId instead of studentId
  GET  /api/paychecks/pdf?paycheckId=<id>   — binary PDF (self/Management)

Registration / Leads
  POST /api/register  {name, email, requestedType}     — public, no auth
  GET  /api/regforms                        — Management only
  PATCH /api/regforms {regFormId, action: "approve"|"reject"}
  POST /api/leads      {name, email, phone?, source?, notes?}  — public, no auth
  GET  /api/leads                           — Management only
`.trim();

async function callTool(fn) {
  try {
    const result = await fn();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
}

const server = new McpServer({ name: "dcp1", version: "1.0.0" });

server.registerTool(
  "dcp1_api_catalog",
  {
    title: "DivergenCIE API catalog",
    description:
      "Returns the full list of app/api/** routes this server can call via dcp1_request, with method/path/body shape and who's authorized for each. Call this first if unsure what's available.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: "text", text: API_CATALOG }] })
);

server.registerTool(
  "dcp1_whoami",
  {
    title: "Current DivergenCIE identity",
    description: "Shows which account (userId/userType) the configured API key belongs to.",
    inputSchema: {},
  },
  () =>
    callTool(() => {
      const config = loadConfig();
      const { baseUrl, token } = resolveAuth();
      if (!token) throw new Error("Not authenticated — call dcp1_login first, or set DCP1_API_KEY.");
      return { userId: config.userId, userType: config.userType, baseUrl };
    })
);

server.registerTool(
  "dcp1_login",
  {
    title: "Log in and mint an API key",
    description:
      "Authenticates with a username/password (like the web login page), then mints a long-lived API key for that account and stores it for subsequent dcp1_request calls in this session. The password is used once and never stored.",
    inputSchema: {
      username: z.string(),
      password: z.string(),
      label: z.string().optional().describe("Human-readable label for the issued key, e.g. \"Claude MCP\""),
      expiresInDays: z.number().optional().describe("Key lifetime in days (default 90)"),
    },
  },
  ({ username, password, label, expiresInDays }) =>
    callTool(async () => {
      const { baseUrl } = resolveAuth();
      const result = await loginAndMintKey(baseUrl, username, password, { label, expiresInDays });
      return { loggedInAs: result.userId, userType: result.userType, expiresAt: result.expiresAt };
    })
);

server.registerTool(
  "dcp1_request",
  {
    title: "Call any DivergenCIE API route",
    description:
      "Full-parity passthrough to any app/api/** route (see dcp1_api_catalog for the list) — authenticated as whichever account the current API key belongs to. Every authorization rule is identical to the web app: Management can do everything, other roles are scoped exactly like their own dashboard.",
    inputSchema: {
      method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
      path: z.string().describe('e.g. "/api/users" or "/api/me?userId=STU-0001"'),
      body: z.record(z.string(), z.any()).optional().describe("JSON body for POST/PATCH/DELETE routes that need one"),
    },
  },
  ({ method, path, body }) => callTool(() => apiRequest(method, path, body))
);

server.registerTool(
  "dcp1_download",
  {
    title: "Download a binary DivergenCIE resource (PDF/PNG)",
    description:
      "For the 3 binary-response GET routes: /api/invoices/pdf, /api/paychecks/pdf, /api/schedule/image. Returns the file contents base64-encoded.",
    inputSchema: {
      path: z.string().describe('e.g. "/api/invoices/pdf?invoiceId=INV-0001"'),
    },
  },
  ({ path }) =>
    callTool(async () => {
      const buffer = await apiRequestBinary(path);
      return { bytes: buffer.length, base64: buffer.toString("base64") };
    })
);

const transport = new StdioServerTransport();
await server.connect(transport);
