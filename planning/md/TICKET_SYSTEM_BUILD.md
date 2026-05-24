# DivergenCIE Ticket System — Build Checklist & CLI Test Scenarios

> **Anti-slop rules:** No placeholders. No stubs. Every phase ends with a real pass/fail test.  
> Agent must pause before Phase 4 and read the full repo structure to confirm nothing conflicts.  
> CLI login uses cookie-jar curl against NextAuth credentials endpoint — real sessions, real DB writes.

---

## Pre-Flight Check (Run Before Phase 1)

```bash
npx prisma studio          # confirm DB is up and seeded
npm run build              # must pass with 0 errors
curl http://localhost:3000/api/auth/csrf   # must return { csrfToken: "..." }
```

If any of the above fails → **stop, fix, restart.**

---

## Phase 1 — Database Schema (Ticket Model)

### Tasks

- [ ] Open `prisma/schema.prisma`
- [ ] Add `Ticket` model with these exact fields:

```prisma
model Ticket {
  id          String   @id @default(cuid())
  subject     String
  body        String
  status      String   @default("OPEN")   // OPEN | CLOSED | REOPENED
  priority    String   @default("NORMAL") // LOW | NORMAL | HIGH
  creatorId   String
  assignedToId String?
  departmentId String?  // HR | MKT | FIN | PR | IT
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator     User     @relation("TicketCreator",   fields: [creatorId],    references: [id])
  assignedTo  User?    @relation("TicketAssignee",  fields: [assignedToId], references: [id])

  messages    TicketMessage[]
  history     TicketHistory[]
}

model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  senderId  String
  body      String
  isInternal Boolean @default(false)   // internal staff notes vs external reply
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  sender    User     @relation(fields: [senderId], references: [id])
}

model TicketHistory {
  id        String   @id @default(cuid())
  ticketId  String
  actorId   String
  action    String   // CREATED | ASSIGNED | FORWARDED | REPLIED | CLOSED | REOPENED
  meta      String?  // JSON string: { from, to, note }
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  actor     User     @relation(fields: [actorId], references: [id])
}
```

- [ ] Add reverse relations on `User` model for all three new relations
- [ ] Run `npx prisma db push`
- [ ] Run `npx prisma studio` — verify all three tables appear with correct columns

**Phase 1 gate test:**
```bash
npx prisma db push 2>&1 | grep -E "error|Error"
# Must return nothing (no errors)
```

---

## Phase 2 — API Routes

Create these files. No stubs — every handler must write to DB and log a `TicketHistory` entry.

### `POST /api/tickets` — Create ticket

- [ ] Create `src/app/api/tickets/route.ts`
- [ ] Read session via `auth()` from NextAuth
- [ ] Reject unauthenticated requests with 401
- [ ] Accept `{ subject, body, departmentId? }` from body
- [ ] Write `Ticket` row with `status: "OPEN"`, `creatorId: session.user.id`
- [ ] Write `TicketHistory` row: `action: "CREATED"`
- [ ] Return `{ id, subject, status }` with 201

### `GET /api/tickets` — List tickets

- [ ] Create `src/app/api/tickets/route.ts` (add GET handler to same file)
- [ ] Staff/Management: return all tickets filtered by their `departmentId` or all if Management
- [ ] External users: return only tickets where `creatorId === session.user.id`
- [ ] Include `messages` and `history` in response

### `PATCH /api/tickets/[id]` — Update ticket (assign / forward / close / reopen)

- [ ] Create `src/app/api/tickets/[id]/route.ts`
- [ ] Accept `{ action, assignedToId?, note? }` where action is one of:
  - `ASSIGN` — set `assignedToId`, log history
  - `FORWARD` — change `departmentId`, log history with `meta: { from, to }`
  - `CLOSE` — set `status: "CLOSED"`, log history
  - `REOPEN` — set `status: "REOPENED"`, log history
- [ ] Only Management can ASSIGN cross-department
- [ ] SUP roles can ASSIGN within own dept
- [ ] Any authenticated user can REOPEN (triggers L3)

### `POST /api/tickets/[id]/messages` — Reply

- [ ] Create `src/app/api/tickets/[id]/messages/route.ts`
- [ ] Accept `{ body, isInternal? }`
- [ ] Write `TicketMessage`, log `TicketHistory` with action `REPLIED`
- [ ] Update `ticket.updatedAt`

**Phase 2 gate test:**
```bash
# Server must be running: npm run dev

# Get CSRF token
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF: $CSRF"

# Login as a seeded staff user (adjust email/password to your seed data)
curl -s -c /tmp/cookies_staff.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=hr_manager@divergencie.com&password=password123&csrfToken=$CSRF&callbackUrl=/"

# Create a ticket
curl -s -b /tmp/cookies_staff.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Phase 2 Gate Test","body":"Testing ticket creation","departmentId":"HR"}' | python3 -m json.tool
# Must return 201 with id
```

---

## Phase 3 — Seed Users (All Roles)

- [ ] Open `prisma/seed.ts` (or `seed.js`)
- [ ] Ensure these users exist with **bcrypt-hashed** passwords (password: `password123`):

| Email | Role | Dept | SubGroup |
|---|---|---|---|
| `candidate@test.com` | candidate | — | — |
| `student@test.com` | student | — | — |
| `teacher@test.com` | teacher | — | — |
| `ambassador@test.com` | ambassador | — | — |
| `parent@test.com` | parent | — | — |
| `hr_manager@test.com` | staff | HR | HR_SUP |
| `hr_assistant@test.com` | staff | HR | HR_MEM |
| `mkt_manager@test.com` | staff | MKT | MKT_SUP |
| `mkt_assistant@test.com` | staff | MKT | MKT_MEM |
| `fin_manager@test.com` | staff | FIN | FIN_SUP |
| `acct_assistant@test.com` | staff | FIN | FIN_MEM |
| `pr_manager@test.com` | staff | PR | PR_SUP |
| `pr_assistant@test.com` | staff | PR | PR_MEM |
| `it_manager@test.com` | staff | IT | IT_SUP |
| `it_assistant@test.com` | staff | IT | IT_MEM |
| `management@test.com` | management | — | — |

- [ ] Add `subGroup` field to `User` model if not already present (`String?`)
- [ ] Run `npx prisma db push` then `npx ts-node prisma/seed.ts`
- [ ] Verify in Prisma Studio: all 16 users exist with correct roles

**Phase 3 gate test:**
```bash
npx prisma db execute --stdin <<< "SELECT email, role FROM User WHERE email LIKE '%@test.com';"
# Must return 16 rows
```

---

## Phase 4 — PAUSE HERE

> **Agent: Before continuing, do the following:**
> 1. Run `find src -name "*.ts" -o -name "*.tsx" | head -60` — read the full list
> 2. Check `src/lib/auth.ts` — confirm session object includes `role`, `id`, `departmentId`, `subGroup`
> 3. Check middleware.ts (or proxy.ts if Next.js 16) — confirm protected routes include `/portal` and `/api/tickets`
> 4. Check if `User` model already has a `departmentId` and `subGroup` field — if yes, do NOT duplicate
> 5. Run `npm run build` — if it fails, fix before Phase 5
>
> **If any of the above reveals a conflict, stop and resolve it. Do not proceed.**

---

## Phase 5 — Portal UI (Ticket Views)

- [ ] `src/app/portal/staff/tickets/page.tsx` — staff ticket list with filter by status/dept
- [ ] `src/app/portal/management/tickets/page.tsx` — all tickets, assign/forward controls
- [ ] `src/app/portal/student/tickets/page.tsx` — external user: my tickets + create button
- [ ] `src/app/portal/candidate/tickets/page.tsx` — same pattern as student
- [ ] `src/app/portal/teacher/tickets/page.tsx` — same pattern
- [ ] `src/app/portal/ambassador/tickets/page.tsx` — same pattern
- [ ] `src/app/portal/parent/tickets/page.tsx` — same pattern
- [ ] Shared component: `src/components/portal/TicketCard.tsx` — status badge, subject, dept, assignee
- [ ] Shared component: `src/components/portal/TicketTimeline.tsx` — renders `TicketHistory` entries
- [ ] All pages: dark/light mode support, Framer Motion fade-in, Satoshi font

**Phase 5 gate test:**
```bash
npm run build 2>&1 | grep -E "error|Error"
# Must return nothing
```

---

## Phase 6 — Role-Permission Guards

- [ ] Management can: assign to any dept, forward anywhere, close, see all
- [ ] `*_SUP` can: assign within own dept, forward to Management, close own dept tickets
- [ ] `*_MEM` can: reply, mark internal note, cannot assign
- [ ] External users can: create, reply to own tickets, request reopen
- [ ] Implement as a helper `src/lib/ticketPermissions.ts`:

```typescript
// src/lib/ticketPermissions.ts
export type TicketAction = 'ASSIGN' | 'FORWARD' | 'CLOSE' | 'REOPEN' | 'REPLY' | 'CREATE'

export function canPerform(action: TicketAction, role: string, subGroup: string | null): boolean {
  if (role === 'management') return true
  if (action === 'CREATE') return true
  if (action === 'REPLY') return true
  if (action === 'REOPEN') return true
  if (action === 'CLOSE' && subGroup?.endsWith('_SUP')) return true
  if (action === 'ASSIGN' && subGroup?.endsWith('_SUP')) return true
  if (action === 'FORWARD' && subGroup?.endsWith('_SUP')) return true
  return false
}
```

- [ ] Import and call in every PATCH handler before executing action
- [ ] Return 403 with `{ error: "Forbidden" }` on failure

---

---

# CLI Test Scenarios

> **How to run:** `npm run dev` must be running. Run each scenario in order.  
> Each scenario produces a ticket ID — note it down, then verify in Prisma Studio or `/api/tickets/[id]`.  
> All logins use cookie jars. Log out by deleting the jar file.

## Helper script — save as `test_login.sh`

```bash
#!/bin/bash
# Usage: source test_login.sh <email> <password> <cookie_file>
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s -c $3 -X POST "http://localhost:3000/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=$1" \
  --data-urlencode "password=$2" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=/" > /dev/null
echo "Logged in as $1 → $3"
```

---

## Scenario 1 — Candidate creates HR ticket → HR Manager assigns to HR Assistant → HR Assistant replies → Candidate replies → HR Manager closes

**Ticket trace you will verify:** `status: CLOSED`, history has CREATED → ASSIGNED → REPLIED (×2) → CLOSED

```bash
# Step 1: Candidate logs in and creates ticket
bash test_login.sh candidate@test.com password123 /tmp/c_candidate.txt
TICKET1=$(curl -s -b /tmp/c_candidate.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Interview Slot Request","body":"I applied for the Data Analyst role. When can I schedule my interview?","departmentId":"HR"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
echo "TICKET1: $TICKET1"

# Step 2: Candidate logs out
rm /tmp/c_candidate.txt

# Step 3: HR Manager logs in and assigns to HR Assistant
bash test_login.sh hr_manager@test.com password123 /tmp/c_hrm.txt
HR_ASST_ID=$(curl -s -b /tmp/c_hrm.txt http://localhost:3000/api/users?email=hr_assistant@test.com \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -b /tmp/c_hrm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET1" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"ASSIGN\",\"assignedToId\":\"$HR_ASST_ID\"}"
echo "Step 3 done — assigned to HR Assistant"
rm /tmp/c_hrm.txt

# Step 4: HR Assistant logs in and replies
bash test_login.sh hr_assistant@test.com password123 /tmp/c_hra.txt
curl -s -b /tmp/c_hra.txt -X POST "http://localhost:3000/api/tickets/$TICKET1/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Hi, please pick a slot from this Calendly link: calendly.com/divergencie-hr","isInternal":false}'
echo "Step 4 done — HR Assistant replied"
rm /tmp/c_hra.txt

# Step 5: Candidate logs in and replies
bash test_login.sh candidate@test.com password123 /tmp/c_candidate.txt
curl -s -b /tmp/c_candidate.txt -X POST "http://localhost:3000/api/tickets/$TICKET1/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Booked for Thursday 3pm. Thank you!"}'
echo "Step 5 done — Candidate replied"
rm /tmp/c_candidate.txt

# Step 6: HR Manager logs in and closes
bash test_login.sh hr_manager@test.com password123 /tmp/c_hrm.txt
curl -s -b /tmp/c_hrm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET1" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'
echo "Step 6 done — ticket closed"
rm /tmp/c_hrm.txt

# Verify
echo "=== FINAL STATE ==="
bash test_login.sh hr_manager@test.com password123 /tmp/c_verify.txt
curl -s -b /tmp/c_verify.txt "http://localhost:3000/api/tickets/$TICKET1" | python3 -m json.tool
rm /tmp/c_verify.txt
```

**Expected in history:** CREATED, ASSIGNED, REPLIED, REPLIED, CLOSED — 5 entries

---

## Scenario 2 — Student creates ticket → Management forwards to Finance → Finance Manager assigns to Accountant → Accountant replies with internal note → Management closes

**Ticket trace:** CREATED → FORWARDED (to FIN) → ASSIGNED → REPLIED (internal) → CLOSED

```bash
bash test_login.sh student@test.com password123 /tmp/c_student.txt
TICKET2=$(curl -s -b /tmp/c_student.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Invoice for Term 2 Fees","body":"I have not received my invoice for Term 2. Please advise."}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "TICKET2: $TICKET2"
rm /tmp/c_student.txt

# Management forwards to Finance
bash test_login.sh management@test.com password123 /tmp/c_mgt.txt
curl -s -b /tmp/c_mgt.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET2" \
  -H "Content-Type: application/json" \
  -d '{"action":"FORWARD","departmentId":"FIN","note":"Route to Finance team"}'
echo "Forwarded to FIN"

# Finance Manager assigns to Accountant
FIN_ASST_ID=$(curl -s -b /tmp/c_mgt.txt http://localhost:3000/api/users?email=acct_assistant@test.com \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
rm /tmp/c_mgt.txt

bash test_login.sh fin_manager@test.com password123 /tmp/c_finm.txt
curl -s -b /tmp/c_finm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET2" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"ASSIGN\",\"assignedToId\":\"$FIN_ASST_ID\"}"
echo "Assigned to Accountant"
rm /tmp/c_finm.txt

# Accountant posts internal note
bash test_login.sh acct_assistant@test.com password123 /tmp/c_acct.txt
curl -s -b /tmp/c_acct.txt -X POST "http://localhost:3000/api/tickets/$TICKET2/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Invoice #INV-2024-0042 already sent on 1 Nov. Will resend. Note for team: check if email bounced.","isInternal":true}'
echo "Internal note posted"
rm /tmp/c_acct.txt

# Management closes
bash test_login.sh management@test.com password123 /tmp/c_mgt.txt
curl -s -b /tmp/c_mgt.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET2" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'
echo "Closed by Management"

curl -s -b /tmp/c_mgt.txt "http://localhost:3000/api/tickets/$TICKET2" | python3 -m json.tool
rm /tmp/c_mgt.txt
```

**Expected:** history has 5 entries. Message with `isInternal: true` must NOT be visible when student fetches the ticket.

---

## Scenario 3 — Teacher submits PR ticket → PR Manager replies → Teacher is dissatisfied, requests reopen → PR Manager replies again → PR Manager closes

**Ticket trace:** CREATED → REPLIED → REOPENED → REPLIED → CLOSED

```bash
bash test_login.sh teacher@test.com password123 /tmp/c_teacher.txt
TICKET3=$(curl -s -b /tmp/c_teacher.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Teaching Materials Missing from Website","body":"The lesson slides for Module 3 are not on the student portal. Please fix asap.","departmentId":"PR"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "TICKET3: $TICKET3"
rm /tmp/c_teacher.txt

# PR Manager replies
bash test_login.sh pr_manager@test.com password123 /tmp/c_prm.txt
curl -s -b /tmp/c_prm.txt -X POST "http://localhost:3000/api/tickets/$TICKET3/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"We have uploaded the Module 3 slides. Please check again."}'

curl -s -b /tmp/c_prm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET3" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'
echo "PR Manager replied and closed"
rm /tmp/c_prm.txt

# Teacher logs in, checks and reopens
bash test_login.sh teacher@test.com password123 /tmp/c_teacher.txt
curl -s -b /tmp/c_teacher.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET3" \
  -H "Content-Type: application/json" \
  -d '{"action":"REOPEN","note":"Still not showing. I checked on Chrome and Safari."}'
echo "Teacher reopened ticket"
rm /tmp/c_teacher.txt

# PR Manager replies again
bash test_login.sh pr_manager@test.com password123 /tmp/c_prm.txt
curl -s -b /tmp/c_prm.txt -X POST "http://localhost:3000/api/tickets/$TICKET3/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Cache issue. Hard-refresh with Ctrl+Shift+R. Confirmed live on our end."}'

curl -s -b /tmp/c_prm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET3" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'
echo "Final close"

curl -s -b /tmp/c_prm.txt "http://localhost:3000/api/tickets/$TICKET3" | python3 -m json.tool
rm /tmp/c_prm.txt
```

**Expected:** status CLOSED, history shows CREATED → REPLIED → CLOSED → REOPENED → REPLIED → CLOSED (6 entries)

---

## Scenario 4 — Ambassador submits MKT ticket → MKT Manager forwards to Management (escalation) → Management assigns back to MKT Assistant → MKT Assistant replies → Ambassador replies → MKT Manager closes

**Ticket trace:** CREATED → FORWARDED (MKT→MGT escalation) → ASSIGNED (back to MKT_MEM) → REPLIED (×2) → CLOSED

```bash
bash test_login.sh ambassador@test.com password123 /tmp/c_amb.txt
TICKET4=$(curl -s -b /tmp/c_amb.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Ambassador Referral Link Not Working","body":"My personal referral link returns 404. I have 3 pending referrals I cannot track.","departmentId":"MKT"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "TICKET4: $TICKET4"
rm /tmp/c_amb.txt

# MKT Manager escalates to Management
bash test_login.sh mkt_manager@test.com password123 /tmp/c_mktm.txt
curl -s -b /tmp/c_mktm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET4" \
  -H "Content-Type: application/json" \
  -d '{"action":"FORWARD","departmentId":"MANAGEMENT","note":"Escalating — referral system issue, needs IT + MKT coordination"}'
echo "Forwarded to Management"
rm /tmp/c_mktm.txt

# Management assigns to MKT Assistant
bash test_login.sh management@test.com password123 /tmp/c_mgt.txt
MKT_ASST_ID=$(curl -s -b /tmp/c_mgt.txt http://localhost:3000/api/users?email=mkt_assistant@test.com \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -b /tmp/c_mgt.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET4" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"ASSIGN\",\"assignedToId\":\"$MKT_ASST_ID\"}"
echo "Assigned to MKT Assistant"
rm /tmp/c_mgt.txt

# MKT Assistant replies
bash test_login.sh mkt_assistant@test.com password123 /tmp/c_mkta.txt
curl -s -b /tmp/c_mkta.txt -X POST "http://localhost:3000/api/tickets/$TICKET4/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Hi, we have regenerated your referral link. New link: divergencie.com/ref/AMB-2024-017. Your 3 referrals have been manually credited."}'
echo "MKT Assistant replied"
rm /tmp/c_mkta.txt

# Ambassador replies
bash test_login.sh ambassador@test.com password123 /tmp/c_amb.txt
curl -s -b /tmp/c_amb.txt -X POST "http://localhost:3000/api/tickets/$TICKET4/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"New link works. Thank you for crediting the referrals."}'
echo "Ambassador replied"
rm /tmp/c_amb.txt

# MKT Manager closes
bash test_login.sh mkt_manager@test.com password123 /tmp/c_mktm.txt
curl -s -b /tmp/c_mktm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET4" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'

curl -s -b /tmp/c_mktm.txt "http://localhost:3000/api/tickets/$TICKET4" | python3 -m json.tool
rm /tmp/c_mktm.txt
```

**Expected:** 6 history entries. `assignedTo.email` = `mkt_assistant@test.com`. `status: CLOSED`.

---

## Scenario 5 — Parent submits IT ticket → IT Manager assigns to AI Intern → AI Intern replies → IT Manager forwards to HR (wrong dept) → HR Manager reassigns to IT → IT Assistant resolves and closes

**Ticket trace:** CREATED → ASSIGNED (AI Intern) → REPLIED → FORWARDED (IT→HR, wrong dept mistake) → FORWARDED (HR→IT, corrected) → ASSIGNED (IT Asst) → REPLIED → CLOSED

```bash
bash test_login.sh parent@test.com password123 /tmp/c_parent.txt
TICKET5=$(curl -s -b /tmp/c_parent.txt -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Cannot Access Parent Portal","body":"I reset my password but still get error: Invalid session token. Browser: Chrome 119. OS: Windows 11.","departmentId":"IT"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "TICKET5: $TICKET5"
rm /tmp/c_parent.txt

# IT Manager assigns to AI Intern
bash test_login.sh it_manager@test.com password123 /tmp/c_itm.txt
AI_INTERN_ID=$(curl -s -b /tmp/c_itm.txt "http://localhost:3000/api/users?email=ai_intern@test.com" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -b /tmp/c_itm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET5" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"ASSIGN\",\"assignedToId\":\"$AI_INTERN_ID\"}"
echo "Assigned to AI Intern"
rm /tmp/c_itm.txt

# AI Intern logs in and replies (note: AI Intern is IT_MEM, can reply)
# Add ai_intern@test.com to seed as role=staff, dept=IT, subGroup=IT_MEM
bash test_login.sh ai_intern@test.com password123 /tmp/c_aiintern.txt
curl -s -b /tmp/c_aiintern.txt -X POST "http://localhost:3000/api/tickets/$TICKET5/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Hi, could you try clearing cookies and logging in via an incognito window? Also confirm which URL you are using."}'
echo "AI Intern replied"
rm /tmp/c_aiintern.txt

# IT Manager mistakenly forwards to HR
bash test_login.sh it_manager@test.com password123 /tmp/c_itm.txt
curl -s -b /tmp/c_itm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET5" \
  -H "Content-Type: application/json" \
  -d '{"action":"FORWARD","departmentId":"HR","note":"Accidentally routed — please redirect to IT"}'
echo "Mistakenly forwarded to HR"
rm /tmp/c_itm.txt

# HR Manager forwards back to IT
bash test_login.sh hr_manager@test.com password123 /tmp/c_hrm.txt
curl -s -b /tmp/c_hrm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET5" \
  -H "Content-Type: application/json" \
  -d '{"action":"FORWARD","departmentId":"IT","note":"Not an HR matter — returning to IT"}'
echo "HR Manager rerouted back to IT"
rm /tmp/c_hrm.txt

# IT Manager assigns to IT Assistant
bash test_login.sh it_manager@test.com password123 /tmp/c_itm.txt
IT_ASST_ID=$(curl -s -b /tmp/c_itm.txt "http://localhost:3000/api/users?email=it_assistant@test.com" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -b /tmp/c_itm.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET5" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"ASSIGN\",\"assignedToId\":\"$IT_ASST_ID\"}"
rm /tmp/c_itm.txt

# IT Assistant replies and closes
bash test_login.sh it_assistant@test.com password123 /tmp/c_ita.txt
curl -s -b /tmp/c_ita.txt -X POST "http://localhost:3000/api/tickets/$TICKET5/messages" \
  -H "Content-Type: application/json" \
  -d '{"body":"Root cause: stale session token not invalidated on password reset. Fixed in DB. Please try logging in now."}'

curl -s -b /tmp/c_ita.txt -X PATCH "http://localhost:3000/api/tickets/$TICKET5" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLOSE"}'

curl -s -b /tmp/c_ita.txt "http://localhost:3000/api/tickets/$TICKET5" | python3 -m json.tool
rm /tmp/c_ita.txt
```

**Expected:** 8 history entries (CREATED, ASSIGNED, REPLIED, FORWARDED, FORWARDED, ASSIGNED, REPLIED, CLOSED). `departmentId: IT`, `status: CLOSED`.

---

## Final Verification Checklist

After all 5 scenarios run:

```bash
# Open Prisma Studio and verify manually:
npx prisma studio
# Check: Ticket table — 5 rows, all CLOSED
# Check: TicketMessage table — messages with correct senderId and isInternal flags
# Check: TicketHistory table — all action entries present, actorId matches expected users
```

- [ ] Ticket 1: 5 history entries, `assignedTo` = HR Assistant, `status: CLOSED`
- [ ] Ticket 2: `TicketMessage` with `isInternal: true` exists, not returned to student via GET
- [ ] Ticket 3: 6 history entries, one REOPENED entry with `actorId` = teacher
- [ ] Ticket 4: `departmentId` = MKT (restored after escalation loop), `assignedTo` = MKT Assistant
- [ ] Ticket 5: 8 history entries, two FORWARDED entries with `meta.from` and `meta.to` populated
- [ ] `npm run build` passes clean after all phases

---

## Known Gotchas

**NextAuth CSRF:** The CSRF token expires per-session. Re-fetch it before each login script run if you get 403.

**Cookie expiry:** NextAuth session cookies expire. If a curl returns 401 mid-scenario, re-run the login step for that user.

**`/api/users?email=`:** You must build this lookup endpoint in Phase 2 or the assign steps will fail. Add `GET /api/users` that returns `{ id, email, role }` — protected, staff/management only.

**SQLite concurrent writes:** SQLite locks on write. Do not run two scenarios in parallel. Run sequentially.

**`subGroup` vs `role` on seed:** Make sure the intern users (`ai_intern@test.com`, `swe_intern@test.com`) are seeded as `role: staff, subGroup: IT_MEM` — not as a separate role.
