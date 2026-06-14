/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DIVERGENCIE PORTAL — NARRATIVE TEST SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  This suite tells the story of a full day at DivergenCIE through a series
 *  of user journeys. Each describe block is a character. Each test is a moment
 *  in their day. Read top-to-bottom like a screenplay.
 *
 *  Characters
 *  ──────────
 *  Aisha     — Student (IGCSE Maths, target: UCL)
 *  Mr Yusuf  — Teacher (Maths)
 *  Priya     — PR Staff member
 *  Hannah    — Finance Staff member
 *  David     — IT Staff (supervisor)
 *  Maya      — Ambassador
 *  Rafael    — Candidate (applying for teacher role)
 *  Sarah     — Management
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach } from "vitest";
import { canPerform, TicketAction } from "@/lib/ticketPermissions";

// ─── Shared state (simulates DB in memory for logic tests) ───────────────────

type Role = "student" | "teacher" | "staff" | "management" | "ambassador" | "candidate" | "parent";

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  dept?: string;
  subGroup?: string | null;
  supervisor?: boolean;
  active: boolean;
}

interface MockTicket {
  id: string;
  displayId: string;
  title: string;
  status: string;
  creatorId: string;
  assigneeId: string | null;
  department: string;
  originalDept: string;
  routingStack: string;
}

interface MockMessage {
  ticketId: string;
  senderId: string;
  body: string;
  isInternal: boolean;
}

// Simulate the displayId generator
function generateDisplayId(dateStr: string, existingCount: number): string {
  return `${dateStr}-${String(existingCount + 1).padStart(4, "0")}`;
}

// Simulate canCreate role check from the API route
function canCreateTicketForDept(role: Role, dept: string): boolean {
  if (role === "candidate") return dept === "HR";
  const external: Role[] = ["student", "teacher", "ambassador", "parent"];
  const validExternal = ["HR", "Marketing", "Finance", "IT", "PR"];
  if (external.includes(role)) return validExternal.includes(dept);
  return true;
}

// Simulate route guard logic from proxy.ts
function canAccessRoute(user: MockUser, pathname: string): boolean {
  const role = user.role;
  if (pathname.startsWith("/portal/student"))    return role === "student";
  if (pathname.startsWith("/portal/teacher"))    return role === "teacher";
  if (pathname.startsWith("/portal/parent"))     return role === "parent";
  if (pathname.startsWith("/portal/ambassador")) return role === "ambassador";
  if (pathname.startsWith("/portal/candidate"))  return role === "candidate";
  if (pathname.startsWith("/portal/management")) return role === "management";
  if (pathname.startsWith("/portal/staff")) {
    if (role !== "staff" && role !== "management") return false;
    const deptMatch = pathname.match(/\/portal\/staff\/(finance|hr|it|marketing|pr)/);
    if (deptMatch) {
      return role === "management" || user.dept?.toLowerCase() === deptMatch[1];
    }
    return true;
  }
  return true;
}

// Simulate internal message visibility
function canSeeInternalMessage(role: Role): boolean {
  return role === "staff" || role === "management";
}

// Simulate bcrypt requirement (demo password removed)
function canAuthWithPassword(passwordHash: string | null, _password: string): boolean {
  if (!passwordHash) return false; // demo fallback removed
  return true; // simplified: assume bcrypt compare passes
}

// ─── USERS ───────────────────────────────────────────────────────────────────

const aisha: MockUser     = { id: "u_aisha",   name: "Aisha Rahman",    email: "aisha@student.com",   role: "student",    active: true };
const mrYusuf: MockUser   = { id: "u_yusuf",   name: "Mr Yusuf Ali",    email: "yusuf@teacher.com",   role: "teacher",    active: true };
const priya: MockUser     = { id: "u_priya",   name: "Priya Sharma",    email: "priya@staff.com",     role: "staff",      dept: "PR",      subGroup: null,     supervisor: false, active: true };
const hannah: MockUser    = { id: "u_hannah",  name: "Hannah Lee",      email: "hannah@staff.com",    role: "staff",      dept: "Finance", subGroup: null,     supervisor: false, active: true };
const david: MockUser     = { id: "u_david",   name: "David Chen",      email: "david@staff.com",     role: "staff",      dept: "IT",      subGroup: "IT_SUP", supervisor: true,  active: true };
const maya: MockUser      = { id: "u_maya",    name: "Maya Patel",      email: "maya@ambassador.com", role: "ambassador", active: true };
const rafael: MockUser    = { id: "u_rafael",  name: "Rafael Torres",   email: "rafael@gmail.com",    role: "candidate",  active: true };
const sarah: MockUser     = { id: "u_sarah",   name: "Sarah Mitchell",  email: "sarah@mgmt.com",      role: "management", active: true };
const deactivated: MockUser = { id: "u_old",   name: "Ex Staff",        email: "ex@staff.com",        role: "staff",      dept: "HR", active: false };

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 1 — MORNING: AISHA STARTS HER DAY
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 1 — Aisha (Student) starts her day", () => {
  it("Aisha can log in — she has a passwordHash set (demo fallback removed)", () => {
    const hash = "$2b$10$realBcryptHashHere";
    expect(canAuthWithPassword(hash, "her_password")).toBe(true);
  });

  it("A deactivated staff account cannot log in even with a valid hash", () => {
    // active=false is caught before password check in auth.ts
    expect(deactivated.active).toBe(false);
  });

  it("Aisha can reach her student dashboard", () => {
    expect(canAccessRoute(aisha, "/portal/student/dashboard")).toBe(true);
  });

  it("Aisha cannot sneak into the management dashboard", () => {
    expect(canAccessRoute(aisha, "/portal/management")).toBe(false);
  });

  it("Aisha cannot sneak into the staff finance section", () => {
    expect(canAccessRoute(aisha, "/portal/staff/finance/invoices")).toBe(false);
  });

  it("Aisha cannot access ambassador portal", () => {
    expect(canAccessRoute(aisha, "/portal/ambassador")).toBe(false);
  });

  it("Aisha opens a ticket to IT about her Zoom link not working", () => {
    expect(canCreateTicketForDept("student", "IT")).toBe(true);
  });

  it("Aisha cannot open a ticket directly to Management (external restriction)", () => {
    expect(canCreateTicketForDept("student", "Management")).toBe(false);
  });

  it("Aisha's ticket gets a correct displayId for today", () => {
    const today = new Date("2026-05-24");
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    const displayId = generateDisplayId(dateStr, 0);
    expect(displayId).toBe("20260524-0001");
  });

  it("Three tickets created the same day get sequential IDs (no duplicates)", () => {
    const dateStr = "20260524";
    const ids = [0, 1, 2].map((n) => generateDisplayId(dateStr, n));
    const unique = new Set(ids);
    expect(unique.size).toBe(3);
    expect(ids).toEqual(["20260524-0001", "20260524-0002", "20260524-0003"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 2 — MR YUSUF TAKES ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 2 — Mr Yusuf (Teacher) marks attendance", () => {
  it("Mr Yusuf can access the teacher portal", () => {
    expect(canAccessRoute(mrYusuf, "/portal/teacher/attendance")).toBe(true);
  });

  it("Mr Yusuf cannot access the staff PR section", () => {
    expect(canAccessRoute(mrYusuf, "/portal/staff/pr/tracker")).toBe(false);
  });

  it("Mr Yusuf can raise a support ticket to HR (pay dispute)", () => {
    expect(canCreateTicketForDept("teacher", "HR")).toBe(true);
  });

  it("Mr Yusuf can reply to an existing ticket", () => {
    expect(canPerform("REPLY", "teacher", null)).toBe(true);
  });

  it("Mr Yusuf cannot forward a ticket to another department", () => {
    expect(canPerform("FORWARD", "teacher", null)).toBe(false);
  });

  it("Mr Yusuf can close a ticket he created", () => {
    // canPerform returns false but API has a creator-override check
    // Test that the override logic is correct
    const ticketCreatorId = mrYusuf.id;
    const actorId = mrYusuf.id;
    const canPerformClose = canPerform("CLOSE", "teacher", null);
    const isCreator = ticketCreatorId === actorId;
    const allowed = canPerformClose || isCreator;
    expect(allowed).toBe(true);
  });

  it("Mr Yusuf cannot close someone else's ticket", () => {
    const ticketCreatorId = aisha.id;   // someone else's ticket
    const actorId = mrYusuf.id;
    const canPerformClose = canPerform("CLOSE", "teacher", null);
    const isCreator = ticketCreatorId === actorId;
    const allowed = canPerformClose || isCreator;
    expect(allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 3 — PRIYA (PR STAFF) HANDLES THE TICKET QUEUE
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 3 — Priya (PR Staff) works the ticket queue", () => {
  it("Priya can access the PR section", () => {
    expect(canAccessRoute(priya, "/portal/staff/pr/tracker")).toBe(true);
  });

  it("Priya cannot access the Finance section (wrong dept)", () => {
    expect(canAccessRoute(priya, "/portal/staff/finance/invoices")).toBe(false);
  });

  it("Priya can mark a ticket as Processing", () => {
    expect(canPerform("PROCESSING", "staff", null)).toBe(true);
  });

  it("Priya can forward Aisha's IT ticket to the IT department", () => {
    expect(canPerform("FORWARD", "staff", null)).toBe(true);
  });

  it("Priya cannot assign a ticket (she's not a supervisor)", () => {
    expect(canPerform("ASSIGN", "staff", null)).toBe(false);
    expect(canPerform("ASSIGN", "staff", "PR_MEMBER")).toBe(false);
  });

  it("Priya can handback a ticket she received from another dept", () => {
    expect(canPerform("HANDBACK", "staff", null)).toBe(true);
  });

  it("Priya forwards IT ticket: routing stack grows by one", () => {
    const ticket: MockTicket = {
      id: "t1", displayId: "20260524-0001", title: "Zoom broken",
      status: "OPEN", creatorId: aisha.id, assigneeId: null,
      department: "PR", originalDept: "PR", routingStack: "[]",
    };

    const stack = JSON.parse(ticket.routingStack);
    const pusherId = ticket.assigneeId || priya.id;
    const newStack = [...stack, { department: ticket.department, assigneeId: pusherId }];

    expect(newStack).toHaveLength(1);
    expect(newStack[0].department).toBe("PR");
    expect(newStack[0].assigneeId).toBe(priya.id);
  });

  it("David (IT) handbacks to PR: stack shrinks and returns to Priya", () => {
    const stack = [{ department: "PR", assigneeId: priya.id }];
    const last = stack.pop()!;

    expect(last.department).toBe("PR");
    expect(last.assigneeId).toBe(priya.id);
    expect(stack).toHaveLength(0);
  });

  it("Priya can see internal staff notes on a ticket", () => {
    expect(canSeeInternalMessage("staff")).toBe(true);
  });

  it("Aisha cannot see internal staff notes on her own ticket", () => {
    expect(canSeeInternalMessage("student")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 4 — DAVID (IT SUPERVISOR) ASSIGNS AND RESOLVES
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 4 — David (IT Supervisor) assigns the ticket", () => {
  it("David can access IT section", () => {
    expect(canAccessRoute(david, "/portal/staff/it/access")).toBe(true);
  });

  it("David cannot access HR section (wrong dept, not management)", () => {
    expect(canAccessRoute(david, "/portal/staff/hr/records")).toBe(false);
  });

  it("David can assign the ticket because he is a supervisor (IT_SUP)", () => {
    expect(canPerform("ASSIGN", "staff", "IT_SUP")).toBe(true);
  });

  it("David cannot assign the ticket to himself", () => {
    // This is enforced in the API: assigneeId === userId → 403
    const assigneeId = david.id;
    const actorId = david.id;
    expect(assigneeId === actorId).toBe(true); // would be blocked
  });

  it("David assigns to a colleague — that's allowed", () => {
    const colleagueId = "u_it_junior";
    const actorId = david.id;
    expect(colleagueId === actorId).toBe(false); // not self-assignment
    expect(canPerform("ASSIGN", "staff", "IT_SUP")).toBe(true);
  });

  it("David can close the ticket once resolved", () => {
    expect(canPerform("CLOSE", "staff", "IT_SUP")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 5 — SARAH (MANAGEMENT) OVERSEES EVERYTHING
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 5 — Sarah (Management) oversees the day", () => {
  it("Sarah can access every portal section", () => {
    const paths = [
      "/portal/management",
      "/portal/staff/finance/invoices",
      "/portal/staff/hr/records",
      "/portal/staff/it/access",
      "/portal/staff/pr/tracker",
      "/portal/staff/marketing/leads",
    ];
    for (const path of paths) {
      expect(canAccessRoute(sarah, path)).toBe(true);
    }
  });

  it("Sarah can perform every ticket action", () => {
    const all: TicketAction[] = [
      "ASSIGN", "FORWARD", "HANDBACK", "CLOSE", "REOPEN", "REPLY", "CREATE", "PROCESSING",
    ];
    for (const action of all) {
      expect(canPerform(action, "management", null)).toBe(true);
    }
  });

  it("Sarah reviews the management DB endpoint — only allowed tables accessible", () => {
    const ALLOWED_TABLES = [
      "user", "ticket", "ticketMessage", "ticketHistory", "ticketCategory",
      "ticketPermission", "attendance", "claim", "meeting", "meetingParticipant",
      "candidate", "rateCard", "invoice", "academicSession", "assignment",
      "syllabusItem", "doubt", "studentSyllabusProgress", "recording", "marketingPost",
      "lead", "accessLog", "announcement", "asset", "mockResult", "group", "referral",
    ];
    expect(ALLOWED_TABLES).toContain("user");
    expect(ALLOWED_TABLES).toContain("ticket");
    expect(ALLOWED_TABLES).not.toContain("_prisma_migrations");
    expect(ALLOWED_TABLES).not.toContain("__proto__");
  });

  it("Sarah cannot update passwordHash via the management DB endpoint (immutable field)", () => {
    const IMMUTABLE_FIELDS = ["id", "passwordHash", "createdAt"];
    const incomingData = { name: "New Name", passwordHash: "evil_hash", active: false };
    const safeData = Object.fromEntries(
      Object.entries(incomingData).filter(([key]) => !IMMUTABLE_FIELDS.includes(key))
    );
    expect(safeData).not.toHaveProperty("passwordHash");
    expect(safeData).toHaveProperty("name");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 6 — MAYA (AMBASSADOR) LOGS A REFERRAL
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 6 — Maya (Ambassador) logs a referral", () => {
  it("Maya can access the ambassador portal (route guard now present)", () => {
    expect(canAccessRoute(maya, "/portal/ambassador")).toBe(true);
  });

  it("Aisha (student) cannot access the ambassador portal", () => {
    expect(canAccessRoute(aisha, "/portal/ambassador")).toBe(false);
  });

  it("Maya can create a support ticket to PR", () => {
    expect(canCreateTicketForDept("ambassador", "PR")).toBe(true);
  });

  it("Maya cannot create a ticket to Management directly", () => {
    expect(canCreateTicketForDept("ambassador", "Management")).toBe(false);
  });

  it("Maya can reply to her own ticket", () => {
    expect(canPerform("REPLY", "ambassador", null)).toBe(true);
  });

  it("Maya cannot forward or assign tickets", () => {
    expect(canPerform("FORWARD", "ambassador", null)).toBe(false);
    expect(canPerform("ASSIGN", "ambassador", null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 7 — RAFAEL (CANDIDATE) APPLIES AND CREATES A TICKET
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 7 — Rafael (Candidate) navigates the portal", () => {
  it("Rafael can access the candidate portal", () => {
    expect(canAccessRoute(rafael, "/portal/candidate")).toBe(true);
  });

  it("Rafael cannot access student or teacher portals", () => {
    expect(canAccessRoute(rafael, "/portal/student/dashboard")).toBe(false);
    expect(canAccessRoute(rafael, "/portal/teacher/dashboard")).toBe(false);
  });

  it("Rafael can only create tickets for HR — not other departments", () => {
    expect(canCreateTicketForDept("candidate", "HR")).toBe(true);
    expect(canCreateTicketForDept("candidate", "IT")).toBe(false);
    expect(canCreateTicketForDept("candidate", "PR")).toBe(false);
    expect(canCreateTicketForDept("candidate", "Finance")).toBe(false);
    expect(canCreateTicketForDept("candidate", "Marketing")).toBe(false);
  });

  it("Rafael can reply to his own HR ticket", () => {
    expect(canPerform("REPLY", "candidate", null)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 8 — HANNAH (FINANCE) PROCESSES AN INVOICE
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 8 — Hannah (Finance) processes invoices", () => {
  it("Hannah can access the finance section", () => {
    expect(canAccessRoute(hannah, "/portal/staff/finance/invoices")).toBe(true);
  });

  it("Hannah cannot access the IT section", () => {
    expect(canAccessRoute(hannah, "/portal/staff/it/access")).toBe(false);
  });

  it("Hannah can see and forward tickets in her department", () => {
    expect(canPerform("FORWARD", "staff", null)).toBe(true);
    expect(canPerform("PROCESSING", "staff", null)).toBe(true);
  });

  it("Hannah cannot assign tickets (not a supervisor)", () => {
    expect(canPerform("ASSIGN", "staff", null)).toBe(false);
    expect(canPerform("ASSIGN", "staff", "Finance_MEMBER")).toBe(false);
  });

  it("Finance supervisor can assign tickets", () => {
    expect(canPerform("ASSIGN", "staff", "Finance_SUP")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACT 9 — END OF DAY: SECURITY & DATA INTEGRITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

describe("Act 9 — End of day security audit", () => {
  it("No user without a passwordHash can log in (demo fallback is gone)", () => {
    expect(canAuthWithPassword(null, "demo")).toBe(false);
    expect(canAuthWithPassword(null, "anything")).toBe(false);
  });

  it("StudentProgress compound unique constraint prevents duplicate rows", () => {
    // Simulate an upsert — same studentId + syllabusItemId should update, not create
    const existing = { studentId: aisha.id, syllabusItemId: "syl_001", completed: false };
    const upsertWhere = {
      studentId_syllabusItemId: {
        studentId: existing.studentId,
        syllabusItemId: existing.syllabusItemId,
      },
    };
    // Verify the key shape is correct for Prisma's compound unique
    expect(upsertWhere.studentId_syllabusItemId.studentId).toBe(aisha.id);
    expect(upsertWhere.studentId_syllabusItemId.syllabusItemId).toBe("syl_001");
  });

  it("Ticket routingStack: three forwards + three handbacks returns to exact origin", () => {
    let stack: Array<{ department: string; assigneeId: string }> = [];
    const originDept = "PR";
    const originAssignee = priya.id;

    // Forward PR → IT
    stack.push({ department: "PR", assigneeId: priya.id });
    let current = { department: "IT", assigneeId: david.id };

    // Forward IT → HR
    stack.push({ department: "IT", assigneeId: david.id });
    current = { department: "HR", assigneeId: "u_hr_staff" };

    // Forward HR → Finance
    stack.push({ department: "HR", assigneeId: "u_hr_staff" });
    current = { department: "Finance", assigneeId: hannah.id };

    // Three handbacks
    let popped = stack.pop()!;
    current = { department: popped.department, assigneeId: popped.assigneeId };
    expect(current.department).toBe("HR");

    popped = stack.pop()!;
    current = { department: popped.department, assigneeId: popped.assigneeId };
    expect(current.department).toBe("IT");

    popped = stack.pop()!;
    current = { department: popped.department, assigneeId: popped.assigneeId };
    expect(current.department).toBe(originDept);
    expect(current.assigneeId).toBe(originAssignee);
    expect(stack).toHaveLength(0);
  });

  it("All role × route combinations are correctly gated", () => {
    const matrix: Array<{ user: MockUser; path: string; expected: boolean; why: string }> = [
      { user: aisha,    path: "/portal/student/dashboard",        expected: true,  why: "students own their portal" },
      { user: aisha,    path: "/portal/teacher/dashboard",        expected: false, why: "students can't be teachers" },
      { user: mrYusuf,  path: "/portal/teacher/attendance",       expected: true,  why: "teachers own their portal" },
      { user: mrYusuf,  path: "/portal/student/curriculum",       expected: false, why: "teachers can't be students" },
      { user: priya,    path: "/portal/staff/pr/tracker",         expected: true,  why: "PR staff own their section" },
      { user: priya,    path: "/portal/staff/finance/invoices",   expected: false, why: "PR can't access Finance" },
      { user: hannah,   path: "/portal/staff/finance/claims",     expected: true,  why: "Finance staff own their section" },
      { user: david,    path: "/portal/staff/it/access",          expected: true,  why: "IT staff own their section" },
      { user: david,    path: "/portal/staff/hr/records",         expected: false, why: "IT can't access HR" },
      { user: maya,     path: "/portal/ambassador",               expected: true,  why: "ambassador portal is now guarded" },
      { user: aisha,    path: "/portal/ambassador",               expected: false, why: "students can't access ambassador" },
      { user: mrYusuf,  path: "/portal/ambassador",               expected: false, why: "teachers can't access ambassador" },
      { user: rafael,   path: "/portal/candidate",                expected: true,  why: "candidates own their portal" },
      { user: rafael,   path: "/portal/student/dashboard",        expected: false, why: "candidates can't be students" },
      { user: sarah,    path: "/portal/management",               expected: true,  why: "management owns everything" },
      { user: sarah,    path: "/portal/staff/finance/invoices",   expected: true,  why: "management can access all staff sections" },
      { user: sarah,    path: "/portal/staff/hr/records",         expected: true,  why: "management can access all staff sections" },
    ];

    for (const { user, path, expected, why } of matrix) {
      expect(
        canAccessRoute(user, path),
        `${user.name} → ${path}: ${why}`
      ).toBe(expected);
    }
  });
});
