// Guard: the new-UI branch must not change the classic UI (planning/new-ui-migration-plan.md section 6).
//   node scripts/guard-classic.mjs            compares the working tree with the merge-base of HEAD and main
//   GUARD_BASE=<ref> node scripts/guard-classic.mjs   use another base
// Fails (exit 1) when a classic file is modified, deleted or renamed. Only two files may carry a small hook.
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

/** Paths that make up the classic UI. `allowAdd`: new files may be added here (still never modified). */
export const CLASSIC = [
  { prefix: "app/dashboard/", allowAdd: false },
  { prefix: "app/login/", allowAdd: false },
  { prefix: "app/register/", allowAdd: false },
  { prefix: "public/mcq-digitizer/", allowAdd: false },
  { prefix: "prototypes/syllabus-digitizer/", allowAdd: false },
  { prefix: "components/", allowAdd: true },
  { prefix: "app/api/", allowAdd: true }, // existing routes must not change; new additive routes are allowed
  { prefix: "lib/client.js", allowAdd: false },
];

/** The only classic files that may change, and how much (added lines, deleted lines). */
export const HOOKS = {
  "components/DashboardShell.jsx": { maxAdded: 45, maxDeleted: 6, why: "one switch button" },
  "lib/client.js": { maxAdded: 30, maxDeleted: 6, why: "post-login redirect honours the UI preference" },
};

/**
 * Pure: changed = [{ status: "A"|"M"|"D"|"R", path, added, deleted }]. Returns a list of violation strings.
 */
export function findViolations(changed) {
  const out = [];
  for (const c of changed) {
    const rule = CLASSIC.find((r) => c.path === r.prefix || c.path.startsWith(r.prefix));
    if (!rule) continue;
    const hook = HOOKS[c.path];
    if (c.status === "A") {
      if (!rule.allowAdd) out.push(`added a file inside the classic UI: ${c.path}`);
      continue;
    }
    if (hook && c.status === "M") {
      if (c.added > hook.maxAdded || c.deleted > hook.maxDeleted) out.push(`${c.path}: hook too large (+${c.added} -${c.deleted}, allowed +${hook.maxAdded} -${hook.maxDeleted}, purpose: ${hook.why})`);
      continue;
    }
    out.push(`${c.status === "M" ? "modified" : c.status === "D" ? "deleted" : "renamed"} a classic file: ${c.path}`);
  }
  return out;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function changedFiles(base) {
  const status = git(["diff", "--name-status", "--find-renames", base]).split("\n").filter(Boolean);
  const numstat = Object.fromEntries(git(["diff", "--numstat", base]).split("\n").filter(Boolean).map((l) => {
    const [a, d, ...p] = l.split("\t");
    return [p.join("\t"), { added: Number(a) || 0, deleted: Number(d) || 0 }];
  }));
  const files = status.map((l) => {
    const parts = l.split("\t");
    const code = parts[0][0];
    const p = parts[parts.length - 1];
    return { status: code, path: p, ...(numstat[p] || { added: 0, deleted: 0 }) };
  });
  // files not yet added to git count too
  for (const p of git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) files.push({ status: "A", path: p, added: 0, deleted: 0 });
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let base = process.env.GUARD_BASE;
  if (!base) {
    try {
      base = git(["merge-base", "HEAD", "main"]);
    } catch {
      console.error("guard-classic: cannot find the merge-base with main");
      process.exit(2);
    }
  }
  const violations = findViolations(changedFiles(base));
  if (violations.length) {
    console.error(`guard-classic: ${violations.length} problem(s) against base ${base.slice(0, 8)}:`);
    for (const v of violations) console.error("  - " + v);
    process.exit(1);
  }
  console.log(`guard-classic: OK (no classic file changed beyond the allowed hooks, base ${base.slice(0, 8)})`);
}
