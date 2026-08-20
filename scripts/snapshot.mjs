#!/usr/bin/env node
// Reusable page-screenshot tool. Every run creates one timestamped folder
// under snapshots/ (gitignored — see .gitignore) and writes one PNG per
// {page, part} entry below, named "<page>--<part>.png".
//
// Usage: node scripts/snapshot.mjs
// Edit the TARGETS array below to add/remove what gets captured.
//
// Each target logs in as a given account (localStorage.dcp1_user + an
// Authorization header, same mechanism the CLI/MCP tools use — no real
// password needed) and optionally runs a list of Playwright actions
// (click a tab, expand a row, etc.) before capturing.

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.SNAPSHOT_BASE_URL || "http://localhost:3000";

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Mints a short-lived API key for `userId` using the existing CLI
// config's Management token (~/.dcp1/config.json) — same auth path
// cli/dcp1.mjs already uses, no password needed.
async function mintToken(managementToken, userId) {
  const res = await fetch(`${BASE_URL}/api/apikeys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId, label: "snapshot-tool", expiresDays: 1 }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Could not mint token for ${userId}: ${JSON.stringify(data)}`);
  return { token: data.token, apiKeyId: data.apiKeyId };
}

// page: label used as the filename prefix
// url: path (relative to BASE_URL) to visit
// userId/userType: who to view it as
// parts: [{ name, actions? }] — one PNG per part; `actions` is an async
//   (page) => {} run after the initial page load, before that part's
//   capture (e.g. click a tab, expand a row) — actions accumulate across
//   parts run in order, so each part builds on the previous one's state.
const TARGETS = [
  {
    page: "management-billing",
    url: "/dashboard/management",
    userId: "MGT-0001",
    userType: "Management",
    parts: [
      { name: "overview", actions: async (page) => {
        await page.getByRole("button", { name: "Billing", exact: true }).click();
        await page.waitForTimeout(1500);
      } },
    ],
  },
  {
    page: "management-schedule",
    url: "/dashboard/management",
    userId: "MGT-0001",
    userType: "Management",
    parts: [
      { name: "list", fullPage: false, actions: async (page) => {
        await page.getByRole("button", { name: "Schedule", exact: true }).click();
        await page.waitForTimeout(1500);
        const listButtons = await page.getByRole("button", { name: "List", exact: true }).all();
        await listButtons[1].click();
        await page.waitForTimeout(1500);
      } },
    ],
  },
  {
    page: "teacher-dashboard",
    url: "/dashboard/teacher",
    userId: "TCH-0001",
    userType: "Teacher",
    parts: [
      { name: "list", fullPage: false, actions: async (page) => {
        await page.getByRole("button", { name: "List", exact: true }).click();
        await page.waitForTimeout(1500);
      } },
    ],
  },
];

async function run() {
  const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, ".dcp1/config.json"), "utf-8"));
  const managementToken = config.token;

  const outDir = path.join(REPO_ROOT, "snapshots", timestamp());
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const mintedKeyIds = [];

  try {
    for (const target of TARGETS) {
      const { token, apiKeyId } = await mintToken(managementToken, target.userId);
      mintedKeyIds.push(apiKeyId);

      const contextPage = await browser.newPage({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
      await contextPage.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 90000 });
      await contextPage.evaluate(
        ({ userId, userType }) => localStorage.setItem("dcp1_user", JSON.stringify({ UserID: userId, UserType: userType })),
        { userId: target.userId, userType: target.userType }
      );
      await contextPage.goto(`${BASE_URL}${target.url}`, { waitUntil: "load", timeout: 90000 });
      await contextPage.waitForTimeout(2500);

      for (const part of target.parts) {
        if (part.actions) await part.actions(contextPage);
        const filename = `${target.page}--${part.name}.png`;
        // fullPage default true; some pages (long unfiltered lists) are
        // too tall to fully rasterize in time — set fullPage: false on
        // that target's part to capture just the viewport instead.
        await contextPage.screenshot({
          path: path.join(outDir, filename),
          fullPage: part.fullPage !== false,
          timeout: 60000,
        });
        console.log(`Saved ${filename}`);
      }

      await contextPage.close();
    }
  } finally {
    await browser.close();
    // Clean up the short-lived keys minted for this run.
    for (const apiKeyId of mintedKeyIds) {
      await fetch(`${BASE_URL}/api/apikeys`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeyId }),
      }).catch(() => {});
    }
  }

  console.log(`\nSnapshot folder: ${outDir}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
