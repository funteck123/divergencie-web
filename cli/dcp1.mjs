#!/usr/bin/env node
// DivergenCIE CLI — full-parity terminal client for the app's own API
// (app/api/**), authenticated via a long-lived API key instead of a
// browser session cookie (see lib/session.js's signApiKey / app/api/
// apikeys/route.js). Any human or agent that can run a shell command can
// use this to operate the system as any user, including Management.
//
// Usage: dcp1 <group> <action> [args...] [--flag value] [--json '<body>']
// Run `dcp1 help` for the full command list.
import { apiRequest, apiRequestBinary, loginAndMintKey, loadConfig, clearConfig, resolveAuth } from "./core.mjs";
import fs from "fs";

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

// `--json '<raw JSON body>'` is the universal escape hatch for
// create/update actions whose body shape varies a lot (Users/Services in
// particular — see app/api/users/route.js, app/api/services/route.js) —
// rather than hand-rolling a --flag per field for 10+ endpoints. Simple
// fixed-shape actions (delete-by-id, etc.) take a plain positional arg
// instead.
function bodyFromFlags(flags) {
  if (flags.json === undefined) return undefined;
  try {
    return JSON.parse(flags.json);
  } catch {
    throw new Error("--json must be valid JSON, e.g. --json '{\"name\":\"...\"}'");
  }
}

function print(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function writeBinary(buffer, outPath, defaultName) {
  const target = outPath || defaultName;
  fs.writeFileSync(target, buffer);
  console.log(`Wrote ${buffer.length} bytes to ${target}`);
}

const HELP = `
DivergenCIE CLI — operate the app from the terminal as any user.

  dcp1 login <username> <password> [--label "my laptop"] [--expires-days 90]
  dcp1 logout
  dcp1 whoami

  dcp1 apikeys create --user <userId> [--label ...] [--expires-days N]
  dcp1 apikeys list                                    (Management only)
  dcp1 apikeys delete <apiKeyId>

  dcp1 users list
  dcp1 users create --json '{"userType":"Student","name":"..."}'
  dcp1 users update <userId> --json '{"name":"..."}'

  dcp1 services list
  dcp1 services create --json '{...}'
  dcp1 services update <serviceId> --json '{...}'

  dcp1 enrollments list
  dcp1 enrollments create --json '{"userId":"...","serviceId":"..."}'
  dcp1 enrollments update <enrolmentId> --json '{...}'
  dcp1 enrollments delete <enrolmentId>

  dcp1 schedule list
  dcp1 schedule create --json '{"serviceType":"Trial","serviceId":"...", ...}'
  dcp1 schedule pick --json '{"scheduleId":"...","userId":"...","type":"Trial"}'
  dcp1 schedule requests list
  dcp1 schedule requests review --json '{"type":"Trial","id":"...","action":"approve"}'
  dcp1 schedule image <userId> [--out schedule.png]

  dcp1 attendance list
  dcp1 attendance log --json '{"scheduleItemId":"...","userId":"...","status":"Present","loggedDuration":1}'

  dcp1 invoices list
  dcp1 invoices generate --year 2026 --month 7
  dcp1 invoices manual --json '{"studentId":"...","serviceId":"...","year":2026,"month":7,"amount":100}'
  dcp1 invoices update <invoiceId> --json '{...}'
  dcp1 invoices delete <invoiceId>
  dcp1 invoices pdf <invoiceId> [--out invoice.pdf]

  dcp1 paychecks list
  dcp1 paychecks generate --year 2026 --month 7
  dcp1 paychecks manual --json '{"staffId":"...","serviceId":"...","year":2026,"month":7,"amount":100}'
  dcp1 paychecks update <paycheckId> --json '{...}'
  dcp1 paychecks delete <paycheckId>
  dcp1 paychecks pdf <paycheckId> [--out paycheck.pdf]

  dcp1 trial feedback --json '{"trialId":"...","feedback":"..."}'
  dcp1 trial enroll --json '{"trialId":"..."}'

  dcp1 interview task --json '{"interviewId":"...","link":"..."}'
  dcp1 interview offer --json '{"interviewId":"...","action":"send"}'

  dcp1 convert <accountId>

  dcp1 regforms list
  dcp1 regforms review --json '{"regFormId":"...","action":"approve"}'

  dcp1 leads list
  dcp1 leads create --json '{"name":"...","email":"..."}'

  dcp1 me [<userId>]                       (defaults to your own account)

Auth: DCP1_API_URL / DCP1_API_KEY env vars override ~/.dcp1/config.json
(written by \`dcp1 login\`). Every command above works for any account
type the target action is authorized for — Management sees/does
everything, other roles are scoped exactly like the web UI (same
lib/authz.js checks, since this hits the identical API routes).
`;

async function main() {
  const { positional: allPositional, flags } = parseArgs(process.argv.slice(2));
  const [group, action, ...positional] = allPositional;

  if (!group || group === "help" || group === "--help" || group === "-h") {
    console.log(HELP);
    return;
  }

  if (group === "login") {
    const username = action;
    const password = positional[0];
    if (!username || !password) throw new Error("Usage: dcp1 login <username> <password>");
    const { baseUrl } = resolveAuth();
    const result = await loginAndMintKey(baseUrl, username, password, {
      label: flags.label,
      expiresInDays: flags["expires-days"] !== undefined ? Number(flags["expires-days"]) : undefined,
    });
    console.log(`Logged in as ${result.userId} (${result.userType}). API key saved to ~/.dcp1/config.json.`);
    return;
  }

  if (group === "logout") {
    clearConfig();
    console.log("Logged out — removed ~/.dcp1/config.json.");
    return;
  }

  if (group === "whoami") {
    const config = loadConfig();
    if (!config.token) {
      console.log("Not logged in.");
      return;
    }
    print({ userId: config.userId, userType: config.userType, baseUrl: config.baseUrl, apiKeyId: config.apiKeyId });
    return;
  }

  if (group === "apikeys") {
    if (action === "create") {
      const userId = flags.user || positional[0];
      if (!userId) throw new Error("Usage: dcp1 apikeys create --user <userId> [--label ...] [--expires-days N]");
      print(
        await apiRequest("POST", "/api/apikeys", {
          userId,
          label: flags.label,
          expiresInDays: flags["expires-days"] !== undefined ? Number(flags["expires-days"]) : undefined,
        })
      );
      return;
    }
    if (action === "list") return print(await apiRequest("GET", "/api/apikeys"));
    if (action === "delete") {
      const apiKeyId = positional[0];
      if (!apiKeyId) throw new Error("Usage: dcp1 apikeys delete <apiKeyId>");
      return print(await apiRequest("DELETE", "/api/apikeys", { apiKeyId }));
    }
    throw new Error(`Unknown action "apikeys ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "users") {
    if (action === "list") return print(await apiRequest("GET", "/api/users"));
    if (action === "create") return print(await apiRequest("POST", "/api/users", bodyFromFlags(flags)));
    if (action === "update") {
      const userId = positional[0];
      if (!userId) throw new Error("Usage: dcp1 users update <userId> --json '{...}'");
      return print(await apiRequest("PATCH", "/api/users", { userId, ...bodyFromFlags(flags) }));
    }
    throw new Error(`Unknown action "users ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "services") {
    if (action === "list") return print(await apiRequest("GET", "/api/services"));
    if (action === "create") return print(await apiRequest("POST", "/api/services", bodyFromFlags(flags)));
    if (action === "update") {
      const serviceId = positional[0];
      if (!serviceId) throw new Error("Usage: dcp1 services update <serviceId> --json '{...}'");
      return print(await apiRequest("PATCH", "/api/services", { serviceId, ...bodyFromFlags(flags) }));
    }
    throw new Error(`Unknown action "services ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "enrollments") {
    if (action === "list") return print(await apiRequest("GET", "/api/enrollments"));
    if (action === "create") return print(await apiRequest("POST", "/api/enrollments", bodyFromFlags(flags)));
    if (action === "update") {
      const enrolmentId = positional[0];
      if (!enrolmentId) throw new Error("Usage: dcp1 enrollments update <enrolmentId> --json '{...}'");
      return print(await apiRequest("PATCH", "/api/enrollments", { enrolmentId, ...bodyFromFlags(flags) }));
    }
    if (action === "delete") {
      const enrolmentId = positional[0];
      if (!enrolmentId) throw new Error("Usage: dcp1 enrollments delete <enrolmentId>");
      return print(await apiRequest("DELETE", "/api/enrollments", { enrolmentId }));
    }
    throw new Error(`Unknown action "enrollments ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "schedule") {
    if (action === "list") return print(await apiRequest("GET", "/api/schedule"));
    if (action === "create") return print(await apiRequest("POST", "/api/schedule", bodyFromFlags(flags)));
    if (action === "pick") return print(await apiRequest("POST", "/api/schedule/pick", bodyFromFlags(flags)));
    if (action === "requests") {
      const sub = positional[0];
      if (sub === "list") return print(await apiRequest("GET", "/api/schedule/requests"));
      if (sub === "review") return print(await apiRequest("PATCH", "/api/schedule/requests", bodyFromFlags(flags)));
      throw new Error("Usage: dcp1 schedule requests list | dcp1 schedule requests review --json '{...}'");
    }
    if (action === "image") {
      const userId = positional[0];
      if (!userId) throw new Error("Usage: dcp1 schedule image <userId> [--out schedule.png]");
      const buffer = await apiRequestBinary(`/api/schedule/image?userId=${encodeURIComponent(userId)}&download=1`);
      return writeBinary(buffer, flags.out, `schedule-${userId}.png`);
    }
    throw new Error(`Unknown action "schedule ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "attendance") {
    if (action === "list") return print(await apiRequest("GET", "/api/attendance"));
    if (action === "log") return print(await apiRequest("POST", "/api/attendance", bodyFromFlags(flags)));
    throw new Error(`Unknown action "attendance ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "invoices") {
    if (action === "list") return print(await apiRequest("GET", "/api/invoices"));
    if (action === "generate") {
      const year = Number(flags.year);
      const month = Number(flags.month);
      if (!year || !month) throw new Error("Usage: dcp1 invoices generate --year 2026 --month 7");
      return print(await apiRequest("POST", "/api/invoices", { action: "generate", year, month }));
    }
    if (action === "manual")
      return print(await apiRequest("POST", "/api/invoices", { action: "manual", ...bodyFromFlags(flags) }));
    if (action === "update") {
      const invoiceId = positional[0];
      if (!invoiceId) throw new Error("Usage: dcp1 invoices update <invoiceId> --json '{...}'");
      return print(await apiRequest("PATCH", "/api/invoices", { invoiceId, ...bodyFromFlags(flags) }));
    }
    if (action === "delete") {
      const invoiceId = positional[0];
      if (!invoiceId) throw new Error("Usage: dcp1 invoices delete <invoiceId>");
      return print(await apiRequest("DELETE", "/api/invoices", { invoiceId }));
    }
    if (action === "pdf") {
      const invoiceId = positional[0];
      if (!invoiceId) throw new Error("Usage: dcp1 invoices pdf <invoiceId> [--out invoice.pdf]");
      const buffer = await apiRequestBinary(`/api/invoices/pdf?invoiceId=${encodeURIComponent(invoiceId)}`);
      return writeBinary(buffer, flags.out, `${invoiceId}.pdf`);
    }
    throw new Error(`Unknown action "invoices ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "paychecks") {
    if (action === "list") return print(await apiRequest("GET", "/api/paychecks"));
    if (action === "generate") {
      const year = Number(flags.year);
      const month = Number(flags.month);
      if (!year || !month) throw new Error("Usage: dcp1 paychecks generate --year 2026 --month 7");
      return print(await apiRequest("POST", "/api/paychecks", { action: "generate", year, month }));
    }
    if (action === "manual")
      return print(await apiRequest("POST", "/api/paychecks", { action: "manual", ...bodyFromFlags(flags) }));
    if (action === "update") {
      const paycheckId = positional[0];
      if (!paycheckId) throw new Error("Usage: dcp1 paychecks update <paycheckId> --json '{...}'");
      return print(await apiRequest("PATCH", "/api/paychecks", { paycheckId, ...bodyFromFlags(flags) }));
    }
    if (action === "delete") {
      const paycheckId = positional[0];
      if (!paycheckId) throw new Error("Usage: dcp1 paychecks delete <paycheckId>");
      return print(await apiRequest("DELETE", "/api/paychecks", { paycheckId }));
    }
    if (action === "pdf") {
      const paycheckId = positional[0];
      if (!paycheckId) throw new Error("Usage: dcp1 paychecks pdf <paycheckId> [--out paycheck.pdf]");
      const buffer = await apiRequestBinary(`/api/paychecks/pdf?paycheckId=${encodeURIComponent(paycheckId)}`);
      return writeBinary(buffer, flags.out, `${paycheckId}.pdf`);
    }
    throw new Error(`Unknown action "paychecks ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "trial") {
    if (action === "feedback") return print(await apiRequest("POST", "/api/trial-feedback", bodyFromFlags(flags)));
    if (action === "enroll") return print(await apiRequest("POST", "/api/trial-enroll", bodyFromFlags(flags)));
    throw new Error(`Unknown action "trial ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "interview") {
    if (action === "task") return print(await apiRequest("POST", "/api/interview-task", bodyFromFlags(flags)));
    if (action === "offer") return print(await apiRequest("POST", "/api/interview-offer", bodyFromFlags(flags)));
    throw new Error(`Unknown action "interview ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "convert") {
    const accountId = action || positional[0];
    if (!accountId) throw new Error("Usage: dcp1 convert <accountId>");
    return print(await apiRequest("POST", "/api/convert", { accountId }));
  }

  if (group === "regforms") {
    if (action === "list") return print(await apiRequest("GET", "/api/regforms"));
    if (action === "review") return print(await apiRequest("PATCH", "/api/regforms", bodyFromFlags(flags)));
    throw new Error(`Unknown action "regforms ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "leads") {
    if (action === "list") return print(await apiRequest("GET", "/api/leads"));
    if (action === "create") return print(await apiRequest("POST", "/api/leads", bodyFromFlags(flags)));
    throw new Error(`Unknown action "leads ${action}". Run \`dcp1 help\`.`);
  }

  if (group === "me") {
    const config = loadConfig();
    const userId = action || config.userId;
    if (!userId) throw new Error("Usage: dcp1 me <userId> (or log in first so it can default to your own account)");
    return print(await apiRequest("GET", `/api/me?userId=${encodeURIComponent(userId)}`));
  }

  throw new Error(`Unknown command "${group}". Run \`dcp1 help\` for the full list.`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
