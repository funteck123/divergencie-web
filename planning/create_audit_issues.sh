#!/bin/bash
# Batch create GitHub issues from audit phases 51-100
# Each issue maps to a specific field-level defect found during ground-truth review

set -euo pipefail
source "$(dirname "$0")/../.env"
export GITHUB_PAT

REPO="funteck123/divergencie-web"
API="https://api.github.com/repos/$REPO/issues"
AUTH="Authorization: token $GITHUB_PAT"

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  
  echo "Creating: $title"
  response=$(curl -s -w "\n%{http_code}" -X POST "$API" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'title': '''$title''', 'body': '''$body''', 'labels': $labels}))")")
  
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "201" ]; then
    number=$(echo "$body_resp" | python3 -c "import json,sys; print(json.load(sys.stdin)['number'])")
    echo "  ✓ Created #$number"
  else
    echo "  ✗ FAILED ($http_code)"
    echo "$body_resp" | head -3
  fi
  
  sleep 1
}

# Using python to properly handle JSON escaping
python3 << 'PYEOF'
import json, subprocess, time, os

REPO = "funteck123/divergencie-web"
API = f"https://api.github.com/repos/{REPO}/issues"

# Resolve .env path relative to the script itself
script_dir = os.path.dirname(os.path.abspath(os.environ.get("_", "")))
# Fallback lookup
env_paths = [
    os.path.join(script_dir, "../.env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "planning/../.env")
]

PAT = os.environ.get("GITHUB_PAT")
if not PAT:
    for path in env_paths:
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    if line.startswith("GITHUB_PAT="):
                        PAT = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        if PAT:
            break

import urllib.request

def create_issue(title, body, labels=None):
    if labels is None:
        labels = ["schema-drift", "audit-phase-51-100"]
    
    data = json.dumps({
        "title": title,
        "body": body,
        "labels": labels
    }).encode()
    
    req = urllib.request.Request(API, data=data, method="POST", headers={
        "Authorization": f"token {PAT}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
    })
    
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"  ✓ #{result['number']} — {title}")
        return result['number']
    except Exception as e:
        print(f"  ✗ FAILED — {title}: {e}")
        return None
    finally:
        time.sleep(1.2)

issues = [
    # ── ISSUE 1: AmbassadorService.rate nullable ──
    {
        "title": "ISSUE-055 (Schema): AmbassadorService.rate should be nullable per §17",
        "body": """## Schema Drift — Phase 51

**Ground Truth:** `system-logic-handoff-v23.md` §17 — AmbassadorService
**Location:** `prisma/schema.prisma` L1047

### Defect
`rate Float` is **non-nullable**. Spec says `rate Float?` because ambassador allowance is optional (some ambassadors get programme access only, no monthly stipend).

### Fix
```diff
- rate        Float
+ rate        Float?
```

### Impact
- Cannot create AmbassadorService records for unpaid programme tracks
- Insertion will fail with required field error
"""
    },
    
    # ── ISSUE 2: Referral.referredStudentId + missing relation ──
    {
        "title": "ISSUE-056 (Schema): Referral missing FK relation for referredStudentId + v19 timestamp fields",
        "body": """## Schema Drift — Phase 52

**Ground Truth:** `system-logic-handoff-v23.md` §17, §49/v19
**Location:** `prisma/schema.prisma` L1725-1749

### Defect 1 — Missing FK Relation
`referredStudentId String?` has **no Prisma relation declared**. Should reference `User` or `StudentProfile`. No referential integrity enforced.

### Defect 2 — Missing v19 Timestamp Fields on ReferralClick
`ReferralClick` missing:
- `convertedToEnquiryAt DateTime?`
- `convertedToEnrolmentAt DateTime?`

These were added in v19 to track conversion timing alongside boolean flags.

### Fix
```diff
  model Referral {
    referredStudentId String?
+   referredStudent   User?    @relation("ReferredStudent", fields: [referredStudentId], references: [id])
  }

  model ReferralClick {
    convertedToEnquiry   Boolean  @default(false)
    convertedToEnrolment Boolean  @default(false)
+   convertedToEnquiryAt   DateTime?
+   convertedToEnrolmentAt DateTime?
  }
```
"""
    },
    
    # ── ISSUE 3: Claim polymorphic FK NOT split ──
    {
        "title": "ISSUE-057 (Schema) [CRITICAL]: Claim/Paycheck v11 FK split NOT applied — still uses single polymorphic enrolmentListId",
        "body": """## Schema Drift — Phase 54/55 — CRITICAL

**Ground Truth:** `system-logic-handoff-v23.md` §18, v11 fix
**Location:** `prisma/schema.prisma` L1859 (Claim), L1925 (Paycheck)

### Defect
v11 mandated splitting single polymorphic `enrolmentListId` into:
- `teacherEnrolmentListId FK` → TeacherEnrolmentList
- `staffEnrolmentListId FK` → StaffEnrolmentList

**Both `Claim` and `Paycheck` still use the old `enrolmentListId String?`.**

This means:
- No Prisma FK relation enforced
- No type safety — can't distinguish teacher from staff claims
- Queries require manual `claimantType` checks instead of using typed FK

### Fix
```diff
  model Claim {
-   enrolmentListId          String?
+   teacherEnrolmentListId   String?
+   teacherEnrolmentList     TeacherEnrolmentList?  @relation(fields: [teacherEnrolmentListId], references: [id])
+   staffEnrolmentListId     String?
+   staffEnrolmentList       StaffEnrolmentList?    @relation(fields: [staffEnrolmentListId], references: [id])
  }
```
Same pattern for `Paycheck`.

### Additional Defects on Claim
- `notes2 String?` — **NOT in spec. Frankenstein residual.**
- `rateApplied Float?` — NOT in spec
- `startDate DateTime?`, `endDate DateTime?`, `paymentDate DateTime?` — NOT in spec
- Missing `statusReason String?`
- `currency @default("INR")` — hardcoded; spec says multi-currency

### Impact
- **HIGH** — Referential integrity broken for the entire payroll pipeline
"""
    },
    
    # ── ISSUE 4: PaycheckLineItem v15 split NOT applied ──
    {
        "title": "ISSUE-058 (Schema): PaycheckLineItem.enrolmentItemId v15 FK split NOT applied",
        "body": """## Schema Drift — Phase 55

**Ground Truth:** `system-logic-handoff-v23.md` §18, v15 fix
**Location:** `prisma/schema.prisma` L1963

### Defect
v15 mandated splitting `enrolmentItemId String?` into:
- `teacherEnrolmentItemId String?` → TeacherEnrolmentItem
- `staffEnrolmentItemId String?` → StaffEnrolmentItem

Still uses single `enrolmentItemId`. Same referential integrity issue as parent Claim/Paycheck.

### Fix
```diff
  model PaycheckLineItem {
-   enrolmentItemId          String?
+   teacherEnrolmentItemId   String?
+   teacherEnrolmentItem     TeacherEnrolmentItem?  @relation(fields: [teacherEnrolmentItemId], references: [id])
+   staffEnrolmentItemId     String?
+   staffEnrolmentItem       StaffEnrolmentItem?    @relation(fields: [staffEnrolmentItemId], references: [id])
  }
```
"""
    },
    
    # ── ISSUE 5: AmbassadorClaim v54 totals NOT applied ──
    {
        "title": "ISSUE-059 (Schema) [CRITICAL]: AmbassadorClaim/AmbassadorClaimLineItem v54 overhaul NOT applied",
        "body": """## Schema Drift — Phase 56 — CRITICAL

**Ground Truth:** `system-logic-handoff-v23.md` §18, §52, §54
**Location:** `prisma/schema.prisma` L1989-2021

### Defect 1 — AmbassadorClaim uses old field names
v54 replaced:
- `totalStudentAmountPaid` → `subtotal`
- `commissionAmount` → removed; replaced with `netAmount` + `dueAmount`

**Still uses old schema.** Missing `subtotal`, `netAmount`, `dueAmount`.

### Defect 2 — AmbassadorClaimLineItem missing v52 fields
Missing:
- `lineType String` (should enforce `"COMMISSION" | "ALLOWANCE"`)
- `ambassadorEnrolmentItemId String?` (for ALLOWANCE lines)
- `rateSnapshot Float?` (for ALLOWANCE lines)

### Defect 3 — AmbassadorPaycheck missing netAmount (v19)
L2044-2045: only has `subtotal` + `dueAmount`. Missing `netAmount Float @default(0)`.

### Impact
- Cannot generate ambassador allowance claims
- Cannot separate COMMISSION vs ALLOWANCE line items
- Financial totals computed incorrectly
"""
    },
    
    # ── ISSUE 6: XRecord tables recordType not migrated to FK ──
    {
        "title": "ISSUE-060 (Schema): All 4 XRecord tables still use string recordType — v21 FK migration NOT applied",
        "body": """## Schema Drift — Phase 63

**Ground Truth:** `system-logic-handoff-v23.md` §27, v21
**Location:** `prisma/schema.prisma` L2307-2361

### Defect
v21 mandated replacing `recordType String` with `recordTypeId String` FK → `RecordType`.

**All four tables affected:**
- `StudentRecord` L2311
- `TeacherRecord` L2325
- `StaffRecord` L2353
- `AmbassadorRecord` L2339

### Fix (per table)
```diff
- recordType          String
+ recordTypeId        String
+ recordType          RecordType  @relation(fields: [recordTypeId], references: [id])
```

### Impact
- No referential integrity on record classification
- RecordType lookup table exists but is orphaned — no FK references it from XRecord tables
"""
    },
    
    # ── ISSUE 7: Ticket/StudentFlag/Candidate/Lead FK lookups NOT migrated ──
    {
        "title": "ISSUE-061 (Schema): Multiple entities still use raw string classifications — v33 FK migration NOT applied",
        "body": """## Schema Drift — Phase 68

**Ground Truth:** `system-logic-handoff-v23.md` §28, §33
**Location:** Multiple schema locations

### Defects (each entity)

**1. Ticket.ticketType (L2241)**
- Still `String?` — should be `ticketTypeId String? FK` → `TicketType`
- `TicketType` lookup table exists (L2380) but **no entity references it via FK**

**2. StudentFlag.flagType (L2369)**
- Still `String` — should be `flagTypeId String FK` → `FlagType`
- `FlagType` lookup table exists (L2394) but **orphaned**
- Also: `flaggedByUserId String` should be nullable for auto-flags

**3. Candidate.outreachSource (L2292)**
- Still `String?` — should be `outreachSourceId String? FK` → `OutreachSource`
- `OutreachSource` lookup table exists (L2420) but **orphaned**

**4. Lead.source (L2802)**
- Still `String?` — should be `outreachSourceId String? FK` → `OutreachSource`
- v19 fix NOT applied
- Also missing `handoffTicketId String? FK` → `Ticket` (v35)

### Impact
- Four lookup tables exist but are completely orphaned — no FK references them
- All classification data is freeform text, allowing typos and inconsistency
"""
    },
    
    # ── ISSUE 8: Notification.readAt missing ──
    {
        "title": "ISSUE-062 (Schema): Notification missing readAt (v48), Announcement missing createdByUserId (v47)",
        "body": """## Schema Drift — Phase 69/70

**Ground Truth:** `system-logic-handoff-v23.md` §29/v48, §25/v47

### Defect 1 — Notification (L2448-2459)
Missing `readAt DateTime?` (v48 addition). Only has `read Boolean`.
Must be set atomically when `read` flipped to true.

### Defect 2 — Announcement (L2671-2684)
Missing `createdByUserId String FK` (v47 addition).
Also: `targetRole String? @default("all")` — should be part of `targets` field or removed (Frankenstein residual).

### Fix
```diff
  model Notification {
    read     Boolean  @default(false)
+   readAt   DateTime?
  }
  
  model Announcement {
+   createdByUserId String
+   createdBy       User   @relation(fields: [createdByUserId], references: [id])
  }
```
"""
    },
    
    # ── ISSUE 9: AccessLog missing v50 fields ──
    {
        "title": "ISSUE-063 (Schema): AccessLog missing revokedAt/revokedByUserId (v50)",
        "body": """## Schema Drift — Phase 71

**Ground Truth:** `system-logic-handoff-v23.md` §25, v50
**Location:** `prisma/schema.prisma` L2753-2763

### Defect
Missing v50 fields:
- `revokedAt DateTime?`
- `revokedByUserId String? FK` → User

Currently only has `revoked Boolean @default(false)` — no timestamp or attribution for revocations.

Also: `staffName String?` is a **denormalized duplicate** of data resolvable via `staffId FK` → `User.name`. Frankenstein residual.

### Fix
```diff
  model AccessLog {
    revoked     Boolean  @default(false)
+   revokedAt   DateTime?
+   revokedByUserId String?
+   revokedByUser   User?    @relation("AccessLogRevoker", fields: [revokedByUserId], references: [id])
  }
```
"""
    },
    
    # ── ISSUE 10: MarketingPost old schema — multiple FK lookups NOT applied ──
    {
        "title": "ISSUE-064 (Schema) [CRITICAL]: MarketingPost completely outdated — v32/v39/v50/v52 FK migrations NOT applied",
        "body": """## Schema Drift — Phase 76 — CRITICAL

**Ground Truth:** `system-logic-handoff-v23.md` §32, §35, §50, §52
**Location:** `prisma/schema.prisma` L2785-2795

### Current (WRONG)
```
model MarketingPost {
  id            String   @id @default(cuid())
  contentType   String?        ← should be contentTypeId FK
  status        String
  canvaLink     String?
  driveLink     String?
  caption       String?
  scheduledDate DateTime
  campaignTag   String?        ← should be removed (v32)
  isActive      Boolean
}
```

### Missing Fields (v32/v39/v50/v52)
- `platformTypeId String FK` → SocialPlatformType
- `postTypeId String FK` → SocialPostType
- `contentTypeId String FK` → ContentType (replaces `contentType String`)
- `createdByUserId String FK` → User (v50)
- `slotId String? FK` → MarketingPostSlot (v52)
- `postedAt DateTime?`
- `postedLink String?`

### Fields to Remove
- `campaignTag String?` — replaced by Campaign → CampaignItem linkage (v32)
- `contentType String?` — replaced by `contentTypeId FK`

### Impact
- **CRITICAL** — MarketingPost is effectively a v1 stub
- Cannot link posts to schedules, campaigns, or lookup tables
- All lookup tables (SocialPlatformType, SocialPostType, ContentType) exist but are orphaned
"""
    },
    
    # ── ISSUE 11: Recording missing meetingId FK + uploadedByUserId ──
    {
        "title": "ISSUE-065 (Schema): Recording missing meetingId FK (v39) and uploadedByUserId FK (v48)",
        "body": """## Schema Drift — Phase 82

**Ground Truth:** `system-logic-handoff-v23.md` §36, §39, §41, §48
**Location:** `prisma/schema.prisma` L2686-2703

### Defect 1 — Missing meetingId FK (v39/v41)
`Recording` has `sessionId String?` but **no `meetingId String?`**. 
v41 added `Meeting ||--o{ Recording : "recorded as"`.
Cannot link recordings to staff/ambassador meetings.

### Defect 2 — Missing uploadedByUserId FK (v48)
v48 added `uploadedByUserId String FK` → User.
No attribution for who uploaded the recording.

### Fix
```diff
  model Recording {
    sessionId     String?
    session       AcademicSession? @relation(...)
+   meetingId     String?
+   meeting       Meeting?         @relation(fields: [meetingId], references: [id])
+   uploadedByUserId String?
+   uploadedByUser   User?         @relation("RecordingUploader", fields: [uploadedByUserId], references: [id])
  }
```
"""
    },
    
    # ── ISSUE 12: CurrencyRate composite unique wrong ──
    {
        "title": "ISSUE-066 (Schema): CurrencyRate has single @unique on fromCurrency — should be composite unique (v46)",
        "body": """## Schema Drift — Phase 90

**Ground Truth:** `system-logic-handoff-v23.md` §44/v46
**Location:** `prisma/schema.prisma` L2776-2783

### Current (WRONG)
```
model CurrencyRate {
  fromCurrency  String    @unique  ← single unique = only ONE rate per source currency!
  toCurrency    String?
  rate          Float
  reverseRate   Float
  effectiveDate DateTime?
}
```

### Defect
- `@unique` on `fromCurrency` alone means only ONE row per source currency. Cannot have USD→INR AND USD→GBP.
- v46 mandated `@@unique([fromCurrency, toCurrency, effectiveDate])` composite.
- `toCurrency` and `effectiveDate` should be non-nullable.

### Fix
```diff
  model CurrencyRate {
-   fromCurrency  String    @unique
-   toCurrency    String?
+   fromCurrency  String
+   toCurrency    String
    rate          Float
    reverseRate   Float
-   effectiveDate DateTime?
+   effectiveDate DateTime
+
+   @@unique([fromCurrency, toCurrency, effectiveDate])
  }
```

### Impact
- **HIGH** — Multi-currency billing broken; cannot store multiple currency pairs or historical rates
"""
    },
    
    # ── ISSUE 13: BacklogItem old flat schema ──
    {
        "title": "ISSUE-067 (Schema) [CRITICAL]: BacklogItem still uses legacy flat schema — v35 restructure NOT applied",
        "body": """## Schema Drift — Phase 100

**Ground Truth:** `system-logic-handoff-v23.md` §35
**Location:** `prisma/schema.prisma` L2821-2840

### Current (WRONG — legacy flat structure)
```
model BacklogItem {
  serialNo        Int?
  importance      String?
  addedToCalendar String?
  addedToCalendar2 String?
  dateAdded       DateTime?
  date            DateTime?
  additionalTask  String?
  event           String?
  desc            String?
  startTime       String?
  endTime         String?
  durationHours   Float?
  location        String?
  tag             String?
  nextSteps       String?
  ticketId        String?   ← should be FK UK (one-to-one mandatory)
}
```

### Required (v35 spec)
```
model BacklogItem {
  id              String       @id @default(cuid())
  ticketId        String       @unique
  ticket          Ticket       @relation(fields: [ticketId], references: [id])
  orgBacklogBankId String
  orgBacklogBank  OrgBacklogBank @relation(fields: [orgBacklogBankId], references: [id])
  deptId          String?
  dept            Department?  @relation(fields: [deptId], references: [id])
  priority        String
  isActive        Boolean      @default(true)
  addedAt         DateTime     @default(now())
}
```

### Impact
- **CRITICAL** — BacklogItem is entirely pre-v35 spreadsheet-import structure
- Cannot link to OrgBacklogBank
- Cannot link to Tickets (no FK relation)
- No dept scoping
- All sprint/backlog meeting lists reference this broken model
"""
    },
    
    # ── ISSUE 14: Candidate missing v33/v19 fields ──
    {
        "title": "ISSUE-068 (Schema): Candidate missing jobPostingId FK (v33), offerLetterLink, rejectionReason, createdAt (v19/v33)",
        "body": """## Schema Drift — Phase 72

**Ground Truth:** `system-logic-handoff-v23.md` §30, §33, v19
**Location:** `prisma/schema.prisma` L280-313

### Missing Fields
- `jobPostingId String? FK` → JobPosting (v33 — link candidate to job posting)
- `offerLetterLink String?` (v33)
- `rejectionReason String?` (v33)
- `createdAt DateTime @default(now())` (v19 — pipeline velocity tracking)

### Present but Non-Spec (Frankenstein residuals)
- `outreach String?` — duplicate of `outreachSource`
- `skills String?`, `extraSkills String?`, `qualifications String?` — should be structured, not free text
- `expectedRate String?` — should be Float
- `interviewTime String?` — should be DateTime
- `gcrAccess String?`, `classSchedule String?`, `workFolder String?` — these belong on TeacherProfile after conversion, not Candidate
- `offerLetterStatus String?` — should be part of status state machine
- `interviewRequestedAt DateTime?` — should be `interviewAt DateTime?` (which exists)

### Impact
- Cannot link candidates to job postings
- No pipeline velocity analytics (no `createdAt`)
"""
    },
    
    # ── ISSUE 15: RegistrationFormEntry.additionalData type mismatch ──
    {
        "title": "ISSUE-069 (Schema): RegistrationFormEntry.additionalData typed String instead of Json",
        "body": """## Schema Drift — Phase 73

**Ground Truth:** `system-logic-handoff-v23.md` §30
**Location:** `prisma/schema.prisma` L2500

### Defect
`additionalData String?` should be `additionalData Json?`.

Dynamic form fields are stored as structured JSON. Using String means:
- Cannot query individual fields within additionalData
- No JSON validation at DB level
- Must parse/stringify manually in application layer

### Fix
```diff
- additionalData         String?
+ additionalData         Json?
```
"""
    },
    
    # ── ISSUE 16: Discount missing appliedByUserId (v47) ──
    {
        "title": "ISSUE-070 (Schema): Discount missing appliedByUserId FK (v47) and createdAt",
        "body": """## Schema Drift — Phase 93

**Ground Truth:** `system-logic-handoff-v23.md` §47
**Location:** `prisma/schema.prisma` L502-515

### Defect
v47 added:
- `appliedByUserId String FK` → User
- `createdAt DateTime @default(now())`

Both **MISSING** from current schema. Cannot attribute who applied a discount or when.

### Impact
- No audit trail for discount application — finance compliance gap
"""
    },
    
    # ── ISSUE 17: Lead missing outreachSourceId FK + handoffTicketId ──
    {
        "title": "ISSUE-071 (Schema): Lead still uses raw string source — missing outreachSourceId FK (v19) and handoffTicketId FK (v35)",
        "body": """## Schema Drift — Phase 95

**Ground Truth:** `system-logic-handoff-v23.md` v19, v35
**Location:** `prisma/schema.prisma` L2797-2808

### Defect 1 — source string not migrated
`source String?` should be `outreachSourceId String? FK` → `OutreachSource` (v19).

### Defect 2 — Missing handoffTicketId
v35 added `handoffTicketId String? FK` → `Ticket`. Set when `passedToPR = true` triggers auto-ticket.

### Fix
```diff
  model Lead {
-   source     String?
+   outreachSourceId String?
+   outreachSource   OutreachSource? @relation(fields: [outreachSourceId], references: [id])
+   handoffTicketId  String?
+   handoffTicket    Ticket?         @relation(fields: [handoffTicketId], references: [id])
  }
```
"""
    },
    
    # ── ISSUE 18: ParentProfile missing linkedStudentId FK (v40) ──
    {
        "title": "ISSUE-072 (Schema) [HIGH]: ParentProfile missing linkedStudentId FK — cannot link parent to student (v40)",
        "body": """## Schema Drift — Phase 96

**Ground Truth:** `system-logic-handoff-v23.md` v40
**Location:** `prisma/schema.prisma` L194-200

### Current
```
model ParentProfile {
  id      String  @id @default(cuid())
  userId  String  @unique
  user    User    @relation(...)
  phone   String?
  address String?
}
```

### Missing
`linkedStudentId String FK` → StudentProfile (v40 addition).

Without this, the parent portal has NO way to resolve which student's data to display. This is the **single most critical field** for the parent journey (UJM §4).

Multi-child support: one ParentProfile per child, all sharing the same `userId`.

### Fix
```diff
  model ParentProfile {
-   userId  String  @unique
+   userId  String
+   linkedStudentId String
+   linkedStudent   StudentProfile @relation(fields: [linkedStudentId], references: [id])
+   @@unique([userId, linkedStudentId])
  }
```

### Impact
- **HIGH** — Parent portal is non-functional without this FK
"""
    },
    
    # ── ISSUE 19: SiteLog.metaBefore/metaAfter typed wrong ──
    {
        "title": "ISSUE-073 (Schema): SiteLog.metaBefore/metaAfter typed String instead of Json",
        "body": """## Schema Drift — Phase 71

**Ground Truth:** `system-logic-handoff-v23.md` §25
**Location:** `prisma/schema.prisma` L2748-2749

### Defect
`metaBefore String?` and `metaAfter String?` should be `Json?`.
These store structured before/after state diffs for audit trail.

### Fix
```diff
- metaBefore String?
- metaAfter  String?
+ metaBefore Json?
+ metaAfter  Json?
```
"""
    },
    
    # ── ISSUE 20: Claim.ClaimLineItem missing claimId FK relation ──
    {
        "title": "ISSUE-074 (Schema): ClaimLineItem missing claimId FK relation declaration",
        "body": """## Schema Drift — Phase 54

**Ground Truth:** `system-logic-handoff-v23.md` §18
**Location:** `prisma/schema.prisma` L1891-1906

### Defect
`ClaimLineItem.claimId String` has **no Prisma @relation** to `Claim`. 
No `onDelete: Cascade` — orphan records will persist if claim deleted.
`Claim` model also has no `lineItems ClaimLineItem[]` reverse relation.

### Fix
```diff
  model ClaimLineItem {
    claimId  String
+   claim    Claim  @relation(fields: [claimId], references: [id], onDelete: Cascade)
  }
  
  model Claim {
+   lineItems ClaimLineItem[]
  }
```
"""
    },
]

print(f"Creating {len(issues)} GitHub issues...")
print("=" * 60)

created = []
for issue in issues:
    num = create_issue(issue["title"], issue["body"])
    if num:
        created.append(num)

print("=" * 60)
print(f"Done. Created {len(created)}/{len(issues)} issues.")
print(f"Issue numbers: {created}")
PYEOF
